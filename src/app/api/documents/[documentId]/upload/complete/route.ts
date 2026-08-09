import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import {
  findDocumentById,
  markDocumentUploaded,
} from "@/features/documents/services/document.service";

import {
  createDocumentStorageKey,
} from "@/features/documents/services/storage/storage-key";

import {
  getObjectMetadata,
} from "@/features/documents/services/storage/s3.service";

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