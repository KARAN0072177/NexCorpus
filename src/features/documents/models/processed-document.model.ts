import mongoose, { Schema, type Model } from "mongoose";

export type ContentBlockBase = {
  id: string;
  page?: number;
};

export type ContentBlock =
  | (ContentBlockBase & {
      type: "heading";
      level: number;
      text: string;
    })
  | (ContentBlockBase & {
      type: "paragraph";
      text: string;
    })
  | (ContentBlockBase & {
      type: "code";
      language?: string;
      text: string;
    })
  | (ContentBlockBase & {
      type: "list";
      ordered: boolean;
      items: string[];
    })
  | (ContentBlockBase & {
      type: "table";
      headers: string[];
      rows: string[][];
    });

export interface IProcessedDocument {
  documentId: mongoose.Types.ObjectId;

  source: {
    filename: string;
    mimeType: string;
  };

  metadata: {
    pageCount?: number;
  };

  blocks: ContentBlock[];

  createdAt: Date;
  updatedAt: Date;
}

const contentBlockSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["heading", "paragraph", "code", "list", "table"],
      required: true,
    },

    level: {
      type: Number,
      min: 1,
      max: 6,
    },

    text: {
      type: String,
      trim: true,
    },

    language: {
      type: String,
      trim: true,
      lowercase: true,
    },

    ordered: {
      type: Boolean,
    },

    items: {
      type: [String],
    },

    headers: {
      type: [String],
    },

    rows: {
      type: [[String]],
    },

    page: {
      type: Number,
      min: 1,
    },
  },
  {
    _id: true,
  }
);

const processedDocumentSchema = new Schema<IProcessedDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true,
      index: true,
    },

    source: {
      filename: {
        type: String,
        required: true,
        trim: true,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
    },

    metadata: {
      pageCount: {
        type: Number,
        min: 1,
      },
    },

    blocks: {
      type: [contentBlockSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Delete cached model in Next.js development mode so schema updates take effect
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).ProcessedDocument;
}

export const ProcessedDocument: Model<IProcessedDocument> =
  mongoose.models.ProcessedDocument ||
  mongoose.model<IProcessedDocument>(
    "ProcessedDocument",
    processedDocumentSchema
  );