import mongoose, { Schema, type Model } from "mongoose";

export type StorageStatus =
  | "PENDING"
  | "UPLOADED"
  | "FAILED";

export type SecurityStatus =
  | "PENDING"
  | "SCANNING"
  | "APPROVED"
  | "REJECTED"
  | "FAILED";

export type ProcessingStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type IndexingStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface IDocument {
  ownerId: mongoose.Types.ObjectId;

  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;

  storageKey?: string;

  storageStatus: StorageStatus;
  securityStatus: SecurityStatus;
  processingStatus: ProcessingStatus;
  indexingStatus: IndexingStatus;

  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    extension: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 20,
    },

    size: {
      type: Number,
      required: true,
      min: 1,
    },

    storageKey: {
      type: String,
      trim: true,
    },

    storageStatus: {
      type: String,
      enum: ["PENDING", "UPLOADED", "FAILED"],
      default: "PENDING",
      required: true,
    },

    securityStatus: {
      type: String,
      enum: [
        "PENDING",
        "SCANNING",
        "APPROVED",
        "REJECTED",
        "FAILED",
      ],
      default: "PENDING",
      required: true,
    },

    processingStatus: {
      type: String,
      enum: [
        "NOT_STARTED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ],
      default: "NOT_STARTED",
      required: true,
    },

    indexingStatus: {
      type: String,
      enum: [
        "NOT_STARTED",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ],
      default: "NOT_STARTED",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Document: Model<IDocument> =
  mongoose.models.Document ||
  mongoose.model<IDocument>("Document", documentSchema);