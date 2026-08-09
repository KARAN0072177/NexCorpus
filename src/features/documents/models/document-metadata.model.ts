import mongoose, { Schema, type Model } from "mongoose";

export type DocumentType =
  | "resume"
  | "report"
  | "article"
  | "notes"
  | "presentation"
  | "invoice"
  | "manual"
  | "book"
  | "unknown";

export interface IDocumentMetadata {
  documentId: mongoose.Types.ObjectId;

  title?: string;

  documentType: DocumentType;

  language?: string;

  createdAt: Date;
  updatedAt: Date;
}

const documentMetadataSchema = new Schema<IDocumentMetadata>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
    },

    documentType: {
      type: String,
      enum: [
        "resume",
        "report",
        "article",
        "notes",
        "presentation",
        "invoice",
        "manual",
        "book",
        "unknown",
      ],
      default: "unknown",
      required: true,
    },

    language: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Delete cached model in Next.js development mode so schema updates take effect
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).DocumentMetadata;
}

export const DocumentMetadata: Model<IDocumentMetadata> =
  mongoose.models.DocumentMetadata ||
  mongoose.model<IDocumentMetadata>(
    "DocumentMetadata",
    documentMetadataSchema
  );