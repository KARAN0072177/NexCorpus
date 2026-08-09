import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import { processDocument } from "@/features/documents/services/processing/processing.service";

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

    const result = await processDocument({
      documentId,
      ownerId: user._id.toString(),
    });

    return NextResponse.json({
      success: true,

      document: {
        id: result.document._id.toString(),
        processingStatus: result.document.processingStatus,
      },

      processedDocument: {
        id: result.processedDocument._id.toString(),
        documentId:
          result.processedDocument.documentId.toString(),

        source: result.processedDocument.source,

        metadata: result.processedDocument.metadata,

        blocks: result.processedDocument.blocks,
      },
    });
  } catch (error) {
    console.error("Document processing failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Document processing failed";

    if (message === "Document not found") {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 404 }
      );
    }

    if (
      message === "Document is not ready for processing"
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "Document does not have a storage key"
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "Document is already being processed"
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 409 }
      );
    }

    if (
      message.startsWith(
        "No processor available for"
      )
    ) {
      return NextResponse.json(
        {
          error: message,
        },
        { status: 415 }
      );
    }

    return NextResponse.json(
      {
        error: "Document processing failed",
      },
      { status: 500 }
    );
  }
}