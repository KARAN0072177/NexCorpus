import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import { findDocumentById } from "@/features/documents/services/document.service";

import { createDocumentStorageKey } from "@/features/documents/services/storage/storage-key";

import { createUploadPresignedUrl } from "@/features/documents/services/storage/s3.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function POST(
  request: Request,
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

    const body = await request.json();

    if (typeof body.contentType !== "string") {
      return NextResponse.json(
        {
          error: "contentType is required",
        },
        { status: 400 }
      );
    }

    if (body.contentType !== document.mimeType) {
      return NextResponse.json(
        {
          error: "Content type does not match document metadata",
        },
        { status: 400 }
      );
    }

    const storageKey = createDocumentStorageKey({
      ownerId: user._id.toString(),
      documentId: document._id.toString(),
      extension: document.extension,
    });

    const uploadUrl = await createUploadPresignedUrl({
      key: storageKey,
      contentType: document.mimeType,
    });

    return NextResponse.json({
      uploadUrl,
      storageKey,
      expiresIn: 300,
    });
  } catch (error) {
    console.error("Presigned upload URL generation failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}