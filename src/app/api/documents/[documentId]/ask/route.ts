import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ragService } from "@/features/documents/services/rag/rag.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    /*
     * --------------------------------------------------
     * Database Connection & Authentication
     * --------------------------------------------------
     */

    await connectToDatabase();

    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    /*
     * --------------------------------------------------
     * Route params & Body
     * --------------------------------------------------
     */

    const { documentId } = await context.params;

    const body = await request.json().catch(() => ({}));

    const { query } = body;

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Document ID is required",
        },
        { status: 400 }
      );
    }

    if (
      !query ||
      typeof query !== "string" ||
      !query.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Query is required",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * Execute RAG Question Answering
     * --------------------------------------------------
     */

    const result = await ragService.askDocument({
      documentId,
      query: query.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Question answered successfully",
      data: result,
    });
  } catch (error) {
    console.error("Document question error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to answer document question",
      },
      { status: 500 }
    );
  }
}