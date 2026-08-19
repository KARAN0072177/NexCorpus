import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { chatService } from "@/features/chat/services/chat.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
    chatId: string;
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

    const { chatId } = await context.params;

    const messages = await chatService.getSessionMessages(
      chatId,
      user._id.toString()
    );

    if (!messages) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages.map((msg) => ({
        id: msg._id.toString(),
        role: msg.role,
        content: msg.content,
        sources: msg.sources || [],
        timestamp: msg.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to load chat messages:", error);

    return NextResponse.json(
      { error: "Internal server error" },
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

    const { chatId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    const updatedSession = await chatService.renameSession(
      chatId,
      user._id.toString(),
      title
    );

    if (!updatedSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession._id.toString(),
        title: updatedSession.title,
        updatedAt: updatedSession.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to rename chat session:", error);

    return NextResponse.json(
      { error: error.message || "Internal server error" },
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

    const { chatId } = await context.params;

    const deleted = await chatService.deleteSession(
      chatId,
      user._id.toString()
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Chat session and messages deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete chat session:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
