import mongoose, { Schema, type Model } from "mongoose";

export interface ICitedSource {
  id: string;
  sectionPath: string[];
  pageStart: number;
  pageEnd: number;
  snippetText?: string;
  similarityScore?: number;
  rank?: number;
}

export interface IChatMessage {
  sessionId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  sources?: ICitedSource[];
  createdAt: Date;
  updatedAt: Date;
}

const citedSourceSchema = new Schema<ICitedSource>(
  {
    id: { type: String, required: true },
    sectionPath: { type: [String], default: [] },
    pageStart: { type: Number, required: true },
    pageEnd: { type: Number, required: true },
    snippetText: { type: String },
    similarityScore: { type: Number },
    rank: { type: Number },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    sources: {
      type: [citedSourceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying session messages sorted chronologically
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", chatMessageSchema);
