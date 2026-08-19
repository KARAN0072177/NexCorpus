import mongoose, { Schema, type Model } from "mongoose";

export interface IChatSession {
  userId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: "New Conversation",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's sessions for a document sorted by recency
chatSessionSchema.index({ userId: 1, documentId: 1, updatedAt: -1 });

export const ChatSession: Model<IChatSession> =
  mongoose.models.ChatSession ||
  mongoose.model<IChatSession>("ChatSession", chatSessionSchema);
