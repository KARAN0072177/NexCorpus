import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  findDocumentById,
  markDocumentUploaded,
} from "@/features/documents/services/document.service";
import { createDocumentStorageKey } from "@/features/documents/services/storage/storage-key";
import { getObjectMetadata } from "@/features/documents/services/storage/s3.service";
import { processDocument } from "@/features/documents/services/processing/processing.service";
import { documentAnalysisService } from "@/features/documents/services/analysis/document-analysis.service";
import { documentChunkService } from "@/features/documents/services/chunking/document-chunk.service";
import { documentEmbeddingService } from "@/features/documents/services/embedding/embedding.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    const { documentId } = await context.params;

    const document = await findDocumentById(
      documentId,
      user._id.toString()
    );

    if (!document) {
      return NextResponse.json(
        {
          error: "Document not found",
        },
        { status: 404 }
      );
    }

    if (document.storageStatus !== "PENDING") {
      return NextResponse.json(
        {
          error: "Document is not waiting for upload",
        },
        { status: 409 }
      );
    }

    const storageKey = createDocumentStorageKey({
      ownerId: user._id.toString(),
      documentId: document._id.toString(),
      extension: document.extension,
    });

    const object = await getObjectMetadata({
      key: storageKey,
    });

    if (!object.ContentLength || object.ContentLength <= 0) {
      return NextResponse.json(
        {
          error: "Uploaded object is empty or unavailable",
        },
        { status: 400 }
      );
    }

    if (object.ContentLength !== document.size) {
      return NextResponse.json(
        {
          error: "Uploaded file size does not match metadata",
        },
        { status: 400 }
      );
    }

    const updatedDocument = await markDocumentUploaded({
      documentId: document._id.toString(),
      ownerId: user._id.toString(),
      storageKey,
    });

    if (!updatedDocument) {
      return NextResponse.json(
        {
          error: "Unable to finalize document upload",
        },
        { status: 500 }
      );
    }

    /*
     * --------------------------------------------------
     * Automatically Trigger End-to-End Ingestion Pipeline:
     * 1. Extract PDF text & parse structural blocks
     * 2. Perform OpenAI semantic analysis (DocumentAIAnalysis)
     * 3. Perform sub-category granular chunking
     * 4. Generate OpenAI embeddings & store in MongoDB Vector Search
     * --------------------------------------------------
     */
    try {
      console.log(`[Upload Complete] Auto-processing document ${documentId}...`);
      await processDocument({
        documentId: updatedDocument._id.toString(),
        ownerId: user._id.toString(),
      });

      console.log(`[Upload Complete] Auto-analyzing document ${documentId}...`);
      await documentAnalysisService.analyzeDocument(updatedDocument._id.toString());

      console.log(`[Upload Complete] Auto-chunking document ${documentId}...`);
      await documentChunkService.createChunks(updatedDocument._id.toString());

      console.log(`[Upload Complete] Auto-embedding document ${documentId}...`);
      await documentEmbeddingService.embedDocument(updatedDocument._id.toString());
      console.log(`[Upload Complete] Document ${documentId} is 100% indexed and ready!`);
    } catch (ingestionError) {
      console.error(`[Upload Complete] Background ingestion pipeline failed for ${documentId}:`, ingestionError);
    }

    return NextResponse.json({
      success: true,
      document: {
        id: updatedDocument._id.toString(),
        storageStatus: updatedDocument.storageStatus,
        storageKey: updatedDocument.storageKey,
      },
    });
  } catch (error) {
    console.error("Document upload completion failed:", error);

    return NextResponse.json(
      {
        error: "Unable to verify uploaded file",
      },
      { status: 500 }
    );
  }
}