import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { ragService } from "@/features/documents/services/rag/rag.service";
import { chatService } from "@/features/chat/services/chat.service";
import type { ICitedSource } from "@/features/chat/models/chat-message.model";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// Token & cost optimization: limit multi-turn chat memory to last 6 messages
const MAX_CONVERSATION_HISTORY = 6;

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
    const { query, conversation, stream = true, sessionId: incomingSessionId } = body;

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

    const trimmedQuery = query.trim();
    const userId = user._id.toString();

    // 1. Resolve or Create Chat Session
    let activeSessionId = incomingSessionId;
    let sessionTitle = "New Conversation";

    if (activeSessionId) {
      const existingSession = await chatService.getSessionById(
        activeSessionId,
        userId
      );
      if (!existingSession) {
        // Fall back to creating a new session if provided ID does not exist
        const newSession = await chatService.createSession(
          userId,
          documentId,
          trimmedQuery.slice(0, 50)
        );
        activeSessionId = newSession._id.toString();
        sessionTitle = newSession.title;
      } else {
        sessionTitle = existingSession.title;
      }
    } else {
      const newSession = await chatService.createSession(
        userId,
        documentId,
        trimmedQuery.slice(0, 50)
      );
      activeSessionId = newSession._id.toString();
      sessionTitle = newSession.title;
    }

    // 2. Persist User Message to DB
    await chatService.saveUserMessage({
      sessionId: activeSessionId,
      documentId,
      userId,
      content: trimmedQuery,
    });

    // 3. Token & Cost Optimization: Slice conversation history to last 6 messages
    const rawConversation: ConversationMessage[] = Array.isArray(conversation)
      ? conversation.map((message) => ({
          role: message?.role,
          content: typeof message?.content === "string" ? message.content.trim() : "",
        }))
      : [];

    const optimizedConversation = rawConversation.slice(-MAX_CONVERSATION_HISTORY);

    /*
     * --------------------------------------------------
     * Non-streaming fallback option
     * --------------------------------------------------
     */
    if (stream === false) {
      const result = await ragService.askDocument({
        documentId,
        query: trimmedQuery,
        conversation: optimizedConversation,
      });

      // Persist assistant message
      await chatService.saveAssistantMessage({
        sessionId: activeSessionId,
        documentId,
        userId,
        content: result.answer,
        sources: result.sources as ICitedSource[],
      });

      return NextResponse.json({
        success: true,
        message: "Question answered successfully",
        sessionId: activeSessionId,
        data: result,
      });
    }

    /*
     * --------------------------------------------------
     * Server-Sent Events (SSE) Streaming Response
     * --------------------------------------------------
     */
    const encoder = new TextEncoder();
    let streamedSources: ICitedSource[] = [];
    let accumulatedAnswer = "";

    const eventStream = new ReadableStream({
      async start(controller) {
        try {
          // Emit session info immediately
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "session",
                sessionId: activeSessionId,
                title: sessionTitle,
              })}\n\n`
            )
          );

          for await (const event of ragService.askDocumentStream({
            documentId,
            query: trimmedQuery,
            conversation: optimizedConversation,
          })) {
            if (event.type === "sources" && event.sources) {
              streamedSources = event.sources as ICitedSource[];
            } else if (event.type === "token" && event.content) {
              accumulatedAnswer += event.content;
            } else if (event.type === "done" && event.fullAnswer) {
              accumulatedAnswer = event.fullAnswer;
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }

          // Persist completed Assistant Message + Sources to DB
          if (accumulatedAnswer.trim()) {
            await chatService.saveAssistantMessage({
              sessionId: activeSessionId,
              documentId,
              userId,
              content: accumulatedAnswer,
              sources: streamedSources,
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          console.error("SSE stream error:", err);
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