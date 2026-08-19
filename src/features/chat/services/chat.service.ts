import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ChatSession, IChatSession } from "../models/chat-session.model";
import { ChatMessage, IChatMessage, ICitedSource } from "../models/chat-message.model";

export class ChatService {
  async getSessions(userId: string, documentId: string) {
    await connectToDatabase();

    return ChatSession.find({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
    }).sort({ updatedAt: -1 });
  }

  async createSession(
    userId: string,
    documentId: string,
    title: string = "New Conversation"
  ) {
    await connectToDatabase();

    return ChatSession.create({
      userId: new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
      title: title.trim().slice(0, 100),
    });
  }

  async getSessionById(sessionId: string, userId: string) {
    await connectToDatabase();

    return ChatSession.findOne({
      _id: new mongoose.Types.ObjectId(sessionId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async getSessionMessages(sessionId: string, userId: string) {
    await connectToDatabase();

    // Verify session belongs to user
    const session = await ChatSession.findOne({
      _id: new mongoose.Types.ObjectId(sessionId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!session) {
      return null;
    }

    return ChatMessage.find({
      sessionId: new mongoose.Types.ObjectId(sessionId),
    }).sort({ createdAt: 1 });
  }

  async saveUserMessage({
    sessionId,
    documentId,
    userId,
    content,
  }: {
    sessionId: string;
    documentId: string;
    userId: string;
    content: string;
  }) {
    await connectToDatabase();

    const sessionObjId = new mongoose.Types.ObjectId(sessionId);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const docObjId = new mongoose.Types.ObjectId(documentId);

    // Save message
    const message = await ChatMessage.create({
      sessionId: sessionObjId,
      documentId: docObjId,
      userId: userObjId,
      role: "user",
      content: content.trim(),
    });

    // Auto-update session title if it's currently "New Conversation"
    const session = await ChatSession.findOne({
      _id: sessionObjId,
      userId: userObjId,
    });

    if (session) {
      if (session.title === "New Conversation" || !session.title) {
        const autoTitle = content.trim().slice(0, 60);
        session.title = autoTitle.length > 0 ? autoTitle : "New Conversation";
      }
      session.updatedAt = new Date();
      await session.save();
    }

    return message;
  }

  async saveAssistantMessage({
    sessionId,
    documentId,
    userId,
    content,
    sources = [],
  }: {
    sessionId: string;
    documentId: string;
    userId: string;
    content: string;
    sources?: ICitedSource[];
  }) {
    await connectToDatabase();

    const sessionObjId = new mongoose.Types.ObjectId(sessionId);
    const userObjId = new mongoose.Types.ObjectId(userId);
    const docObjId = new mongoose.Types.ObjectId(documentId);

    const message = await ChatMessage.create({
      sessionId: sessionObjId,
      documentId: docObjId,
      userId: userObjId,
      role: "assistant",
      content: content.trim(),
      sources: sources || [],
    });

    // Touch session updatedAt
    await ChatSession.findByIdAndUpdate(sessionObjId, {
      $set: { updatedAt: new Date() },
    });

    return message;
  }

  async renameSession(sessionId: string, userId: string, newTitle: string) {
    await connectToDatabase();

    const cleanTitle = newTitle.trim().slice(0, 100);
    if (!cleanTitle) {
      throw new Error("Chat title cannot be empty");
    }

    return ChatSession.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(sessionId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: { title: cleanTitle },
      },
      { new: true }
    );
  }

  async deleteSession(sessionId: string, userId: string) {
    await connectToDatabase();

    const sessionObjId = new mongoose.Types.ObjectId(sessionId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const session = await ChatSession.findOneAndDelete({
      _id: sessionObjId,
      userId: userObjId,
    });

    if (!session) {
      return null;
    }

    // Delete all messages in session
    await ChatMessage.deleteMany({ sessionId: sessionObjId });

    return session;
  }

  async deleteUserChatHistory(userId: string) {
    await connectToDatabase();

    const userObjId = new mongoose.Types.ObjectId(userId);
    await Promise.allSettled([
      ChatSession.deleteMany({ userId: userObjId }),
      ChatMessage.deleteMany({ userId: userObjId }),
    ]);
  }

  async deleteDocumentChatHistory(documentId: string) {
    await connectToDatabase();

    const docObjId = new mongoose.Types.ObjectId(documentId);
    await Promise.allSettled([
      ChatSession.deleteMany({ documentId: docObjId }),
      ChatMessage.deleteMany({ documentId: docObjId }),
    ]);
  }
}

export const chatService = new ChatService();
