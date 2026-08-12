import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import { documentChunkService } from "@/features/documents/services/chunking/document-chunk.service";

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
    /*
     * --------------------------------------------------
     * Authentication
     * --------------------------------------------------
     */

    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    /*
     * --------------------------------------------------
     * Route params
     * --------------------------------------------------
     */

    const { documentId } = await context.params;

    /*
     * --------------------------------------------------
     * Create document chunks
     * --------------------------------------------------
     */

    const result = await documentChunkService.createChunks(documentId);

    return NextResponse.json(
      {
        success: true,
        message: "Document chunks created successfully",
        data: result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Document chunking failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create document chunks",
      },
      {
        status: 500,
      }
    );
  }
}