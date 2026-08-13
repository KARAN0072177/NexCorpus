import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import { documentRetrievalService } from "@/features/documents/services/retrieval/document-retrieval.service";

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
     * Request body
     * --------------------------------------------------
     */

    const body = await request.json().catch(() => ({}));

    const query = typeof body.query === "string" ? body.query.trim() : "";

    const limit = typeof body.limit === "number" ? body.limit : 5;

    /*
     * --------------------------------------------------
     * Validate query
     * --------------------------------------------------
     */

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Search query is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * Retrieval
     * --------------------------------------------------
     */

    const result = await documentRetrievalService.retrieve({
      documentId,
      query,
      limit,
    });

    /*
     * --------------------------------------------------
     * Response
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        message: "Search completed successfully",
        data: result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Document retrieval failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve document chunks",
      },
      {
        status: 500,
      }
    );
  }
}