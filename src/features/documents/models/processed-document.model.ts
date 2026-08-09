import mongoose, { Schema, type Model } from "mongoose";

export type ContentBlock =
  | {
      type: "heading";
      level: number;
      text: string;
      page?: number;
    }
  | {
      type: "paragraph";
      text: string;
      page?: number;
    }
  | {
      type: "code";
      language?: string;
      text: string;
      page?: number;
    }
  | {
      type: "list";
      ordered: boolean;
      items: string[];
      page?: number;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
      page?: number;
    };

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
    type: {
      type: String,
      enum: [
        "heading",
        "paragraph",
        "code",
        "list",
        "table",
      ],
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
    _id: false,
  }
);

const processedDocumentSchema =
  new Schema<IProcessedDocument>(
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

export const ProcessedDocument: Model<IProcessedDocument> =
  mongoose.models.ProcessedDocument ||
  mongoose.model<IProcessedDocument>(
    "ProcessedDocument",
    processedDocumentSchema
  );