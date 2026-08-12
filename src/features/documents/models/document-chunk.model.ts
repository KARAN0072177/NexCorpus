// src/features/documents/models/document-chunk.model.ts
import mongoose, { Schema, type Model } from "mongoose";

export type DocumentChunkType = "parent" | "child";

export type ChunkEmbeddingStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type ChunkIndexingStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface IDocumentChunk {
  documentId: mongoose.Types.ObjectId;

  parentChunkId: mongoose.Types.ObjectId | null;

  chunkType: DocumentChunkType;

  text: string;

  sectionPath: string[];

  sourceBlockIds: string[];

  pageStart: number;

  pageEnd: number;

  documentType: string;

  language: string | null;

  embeddingStatus: ChunkEmbeddingStatus;

  indexingStatus: ChunkIndexingStatus;

  createdAt: Date;

  updatedAt: Date;
}

const documentChunkSchema = new Schema<IDocumentChunk>(
  {
    /*
     * --------------------------------------------------
     * DOCUMENT
     * --------------------------------------------------
     */

    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    /*
     * --------------------------------------------------
     * HIERARCHY
     * --------------------------------------------------
     *
     * null for parent chunks.
     *
     * Child chunks reference their parent
     * chunk through this field.
     */

    parentChunkId: {
      type: Schema.Types.ObjectId,
      ref: "DocumentChunk",
      default: null,
    },

    chunkType: {
      type: String,
      enum: ["parent", "child"],
      required: true,
    },

    /*
     * --------------------------------------------------
     * CONTENT
     * --------------------------------------------------
     */

    text: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * --------------------------------------------------
     * SEMANTIC LOCATION
     * --------------------------------------------------
     *
     * Example:
     *
     * [
     *   "PROJECTS",
     *   "NexSyncHub"
     * ]
     */

    sectionPath: {
      type: [String],
      required: true,
      default: [],
    },

    /*
     * --------------------------------------------------
     * PROVENANCE
     * --------------------------------------------------
     *
     * These IDs point back to the canonical
     * ProcessedDocument blocks.
     */

    sourceBlockIds: {
      type: [String],
      required: true,
      default: [],
    },

    pageStart: {
      type: Number,
      required: true,
      min: 1,
    },

    pageEnd: {
      type: Number,
      required: true,
      min: 1,
    },

    /*
     * --------------------------------------------------
     * DOCUMENT CONTEXT
     * --------------------------------------------------
     */

    documentType: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    /*
     * --------------------------------------------------
     * EMBEDDING STATE
     * --------------------------------------------------
     *
     * Embeddings are intentionally NOT stored here yet.
     *
     * This field only tracks whether the chunk has
     * successfully passed through the embedding stage.
     */

    embeddingStatus: {
      type: String,
      enum: ["NOT_STARTED", "PROCESSING", "COMPLETED", "FAILED"],
      required: true,
      default: "NOT_STARTED",
    },

    /*
     * --------------------------------------------------
     * INDEXING STATE
     * --------------------------------------------------
     *
     * This represents the future retrieval/indexing
     * stage and is deliberately independent from
     * embedding generation.
     */

    indexingStatus: {
      type: String,
      enum: ["NOT_STARTED", "PROCESSING", "COMPLETED", "FAILED"],
      required: true,
      default: "NOT_STARTED",
    },
  },
  {
    timestamps: true,
  }
);

/*
 * --------------------------------------------------
 * INDEXES
 * --------------------------------------------------
 *
 * Common query:
 *
 * "Give me all chunks belonging to this document."
 */

documentChunkSchema.index({
  documentId: 1,
});

/*
 * Common hierarchy query:
 *
 * "Give me all children of this parent."
 */

documentChunkSchema.index({
  parentChunkId: 1,
});

/*
 * Useful for processing pipelines:
 *
 * "Find chunks waiting for embedding."
 */

documentChunkSchema.index({
  embeddingStatus: 1,
});

/*
 * Useful for future indexing workers.
 */

documentChunkSchema.index({
  indexingStatus: 1,
});

// Delete cached model in Next.js development mode so schema updates take effect
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).DocumentChunk;
}

export const DocumentChunk: Model<IDocumentChunk> =
  mongoose.models.DocumentChunk ||
  mongoose.model<IDocumentChunk>("DocumentChunk", documentChunkSchema);