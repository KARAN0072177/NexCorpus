import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import {
  createDocument,
  findDocumentsByOwner,
} from "@/features/documents/services/document.service";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    const body = await request.json();

    if (typeof body.originalFilename !== "string") {
      return NextResponse.json(
        {
          error: "originalFilename is required",
        },
        { status: 400 }
      );
    }

    if (typeof body.mimeType !== "string") {
      return NextResponse.json(
        {
          error: "mimeType is required",
        },
        { status: 400 }
      );
    }

    if (typeof body.extension !== "string") {
      return NextResponse.json(
        {
          error: "extension is required",
        },
        { status: 400 }
      );
    }

    if (
      typeof body.size !== "number" ||
      !Number.isFinite(body.size) ||
      body.size <= 0
    ) {
      return NextResponse.json(
        {
          error: "size must be a positive number",
        },
        { status: 400 }
      );
    }

    const document = await createDocument({
      ownerId: user._id.toString(),

      originalFilename: body.originalFilename,
      mimeType: body.mimeType,
      extension: body.extension,
      size: body.size,
    });

    return NextResponse.json(
      {
        success: true,
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document creation failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    const documents = await findDocumentsByOwner(
      user._id.toString()
    );

    return NextResponse.json({
      documents: documents.map((document) => ({
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
      })),
    });
  } catch (error) {
    console.error("Document listing failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}