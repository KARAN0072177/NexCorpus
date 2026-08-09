import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import {
  deleteDocument,
  findDocumentById,
} from "@/features/documents/services/document.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function GET(
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

    return NextResponse.json({
      document: {
        id: document._id.toString(),
        ownerId: document.ownerId.toString(),

        originalFilename: document.originalFilename,
        mimeType: document.mimeType,
        extension: document.extension,
        size: document.size,

        storageStatus: document.storageStatus,
        securityStatus: document.securityStatus,
        processingStatus: document.processingStatus,
        indexingStatus: document.indexingStatus,

        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error("Document retrieval failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    const { documentId } = await context.params;

    const document = await deleteDocument(
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

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Document deletion failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}