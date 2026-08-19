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
    await connectToDatabase();

    const { user, response } = await requireApiUser();
    if (response) {
      return response;
    }

    const { documentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { query, conversation, stream = true } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document ID is required" },
        { status: 400 }
      );
    }

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    const normalizedConversation: ConversationMessage[] = Array.isArray(conversation)
      ? conversation.map((message) => ({
          role: message?.role,
          content: typeof message?.content === "string" ? message.content.trim() : "",
        }))
      : [];

    /*
     * --------------------------------------------------
     * Non-streaming fallback option
     * --------------------------------------------------
     */
    if (stream === false) {
      const result = await ragService.askDocument({
        documentId,
        query: query.trim(),
        conversation: normalizedConversation,
      });

      return NextResponse.json({
        success: true,
        message: "Question answered successfully",
        data: result,
      });
    }

    /*
     * --------------------------------------------------
     * Server-Sent Events (SSE) Streaming Response
     * --------------------------------------------------
     */
    const encoder = new TextEncoder();
    const eventStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of ragService.askDocumentStream({
            documentId,
            query: query.trim(),
            conversation: normalizedConversation,
          })) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: err.message || "Streaming failed",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(eventStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
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