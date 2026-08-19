import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { chatService } from "@/features/chat/services/chat.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
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

    const { documentId } = await context.params;

    const sessions = await chatService.getSessions(
      user._id.toString(),
      documentId
    );

    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to list chat sessions:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title : "New Conversation";

    const session = await chatService.createSession(
      user._id.toString(),
      documentId,
      title
    );

    return NextResponse.json({
      success: true,
      session: {
        id: session._id.toString(),
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to create chat session:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
