// src/app/api/documents/[documentId]/ask/route.ts

import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongodb";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ragService } from "@/features/documents/services/rag/rag.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
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

    const { user, response } =
      await requireApiUser();

    if (response) {
      return response;
    }

    /*
     * --------------------------------------------------
     * Route params & Body
     * --------------------------------------------------
     */

    const { documentId } =
      await context.params;

    const body =
      await request.json().catch(() => ({}));

    const {
      query,
      conversation,
    } = body;

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
     * Validate Conversation
     * --------------------------------------------------
     */

    if (
      conversation !== undefined &&
      !Array.isArray(conversation)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Conversation must be an array",
        },
        { status: 400 }
      );
    }

    const normalizedConversation: ConversationMessage[] =
      Array.isArray(conversation)
        ? conversation.map(
            (message) => ({
              role: message?.role,
              content:
                typeof message?.content ===
                "string"
                  ? message.content.trim()
                  : "",
            })
          )
        : [];

    const invalidMessage =
      normalizedConversation.some(
        (message) =>
          !["user", "assistant"].includes(
            message.role
          ) ||
          !message.content
      );

    if (invalidMessage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Each conversation message must contain a valid role and content",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * Execute RAG Question Answering
     * --------------------------------------------------
     */

    const result =
      await ragService.askDocument({
        documentId,
        query: query.trim(),
        conversation:
          normalizedConversation,
      });

    return NextResponse.json({
      success: true,
      message:
        "Question answered successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Document question error:",
      error
    );

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