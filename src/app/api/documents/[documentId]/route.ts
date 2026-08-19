import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  deleteDocument,
  findDocumentById,
  renameDocument,
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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    const { documentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const filename = typeof body.filename === "string" ? body.filename.trim() : "";

    if (!filename) {
      return NextResponse.json(
        {
          error: "A valid document name is required",
        },
        { status: 400 }
      );
    }

    if (filename.length > 255) {
      return NextResponse.json(
        {
          error: "Document name cannot exceed 255 characters",
        },
        { status: 400 }
      );
    }

    const updatedDoc = await renameDocument({
      documentId,
      ownerId: user._id.toString(),
      newFilename: filename,
    });

    if (!updatedDoc) {
      return NextResponse.json(
        {
          error: "Document not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document renamed successfully",
      document: {
        id: updatedDoc._id.toString(),
        originalFilename: updatedDoc.originalFilename,
        extension: updatedDoc.extension,
        updatedAt: updatedDoc.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Document rename failed:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to rename document",
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