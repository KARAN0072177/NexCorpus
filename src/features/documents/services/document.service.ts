import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "../models/document.model";
import { DocumentChunk } from "../models/document-chunk.model";
import { ProcessedDocument } from "../models/processed-document.model";
import { DocumentAIAnalysis } from "../models/document-ai-analysis.model";
import { DocumentMetadata } from "../models/document-metadata.model";
import { DocumentStructure } from "../models/document-structure.model";
import { deleteS3Object } from "./storage/s3.service";
import { ragCacheService } from "./rag/cache/rag-cache.service";

export interface CreateDocumentInput {
  ownerId: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
}

export async function createDocument(input: CreateDocumentInput) {
  await connectToDatabase();

  return Document.create({
    ownerId: input.ownerId,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    extension: input.extension,
    size: input.size,
    storageStatus: "PENDING",
    securityStatus: "PENDING",
    processingStatus: "NOT_STARTED",
    indexingStatus: "NOT_STARTED",
  });
}

export async function findDocumentById(
  documentId: string,
  ownerId: string
) {
  await connectToDatabase();

  return Document.findOne({
    _id: documentId,
    ownerId,
  });
}

export async function findDocumentsByOwner(ownerId: string) {
  await connectToDatabase();

  return Document.find({
    ownerId,
  }).sort({
    createdAt: -1,
  });
}

export async function renameDocument({
  documentId,
  ownerId,
  newFilename,
}: {
  documentId: string;
  ownerId: string;
  newFilename: string;
}) {
  await connectToDatabase();

  const cleanFilename = newFilename.trim();
  if (!cleanFilename) {
    throw new Error("Document name cannot be empty");
  }

  const doc = await Document.findOne({
    _id: documentId,
    ownerId,
  });

  if (!doc) {
    return null;
  }

  // Strictly preserve the original extension
  const originalExt = doc.extension.startsWith(".")
    ? doc.extension
    : `.${doc.extension}`;

  let baseName = cleanFilename;
  if (cleanFilename.toLowerCase().endsWith(originalExt.toLowerCase())) {
    baseName = cleanFilename.slice(0, -originalExt.length).trim();
  } else {
    const lastDot = cleanFilename.lastIndexOf(".");
    if (lastDot > 0) {
      baseName = cleanFilename.slice(0, lastDot).trim();
    }
  }

  if (!baseName) {
    throw new Error("Document name cannot be empty");
  }

  const finalFilename = `${baseName}${originalExt}`;

  doc.originalFilename = finalFilename;
  await doc.save();

  return doc;
}

export async function deleteDocument(
  documentId: string,
  ownerId: string
) {
  await connectToDatabase();

  const document = await Document.findOne({
    _id: documentId,
    ownerId,
  });

  if (!document) {
    return null;
  }

  const docObjectId = new mongoose.Types.ObjectId(documentId);

  // 1. Delete associated chunks
  await DocumentChunk.deleteMany({ documentId: docObjectId });

  // 2. Delete processed document records & analyses
  await Promise.allSettled([
    ProcessedDocument.deleteMany({ documentId: docObjectId }),
    DocumentAIAnalysis.deleteMany({ documentId: docObjectId }),
    DocumentMetadata.deleteMany({ documentId: docObjectId }),
    DocumentStructure.deleteMany({ documentId: docObjectId }),
  ]);

  // 3. Delete from S3 storage if storageKey exists
  if (document.storageKey) {
    try {
      await deleteS3Object({ key: document.storageKey });
    } catch (s3Err) {
      console.warn(
        `[deleteDocument] S3 deletion warning for key ${document.storageKey}:`,
        s3Err
      );
    }
  }

  // 4. Invalidate RAG cache
  ragCacheService.invalidateDocument(documentId);

  // 5. Delete document record
  await Document.findByIdAndDelete(documentId);

  return document;
}

export async function markDocumentUploaded({
  documentId,
  ownerId,
  storageKey,
}: {
  documentId: string;
  ownerId: string;
  storageKey: string;
}) {
  await connectToDatabase();

  return Document.findOneAndUpdate(
    {
      _id: documentId,
      ownerId,
      storageStatus: "PENDING",
    },
    {
      $set: {
        storageKey,
        storageStatus: "UPLOADED",
      },
    },
    {
      new: true,
    }
  );
}