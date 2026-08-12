import mongoose, {
  Schema,
  type Model,
} from "mongoose";

/*
 * --------------------------------------------------
 * CHUNK TYPES
 * --------------------------------------------------
 */

export type DocumentChunkType =
  | "parent"
  | "child";

/*
 * --------------------------------------------------
 * EMBEDDING STATUS
 * --------------------------------------------------
 */

export type ChunkEmbeddingStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

/*
 * --------------------------------------------------
 * INDEXING STATUS
 * --------------------------------------------------
 */

export type ChunkIndexingStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

/*
 * --------------------------------------------------
 * DOCUMENT CHUNK INTERFACE
 * --------------------------------------------------
 */

export interface IDocumentChunk {
  documentId: mongoose.Types.ObjectId;

  parentChunkId:
  | mongoose.Types.ObjectId
  | null;

  chunkType: DocumentChunkType;

  text: string;

  sectionPath: string[];

  sourceBlockIds: string[];

  pageStart: number;

  pageEnd: number;

  documentType: string;

  language: string | null;

  /*
   * ------------------------------------------------
   * EMBEDDING
   * ------------------------------------------------
   *
   * We are storing embedding metadata here.
   *
   * The actual vector will be added when we
   * finalize MongoDB Atlas Vector Search storage.
   */

  embedding: number[] | null;

  embeddingModel: string | null;

  embeddingDimensions: number | null;

  embeddingStatus: ChunkEmbeddingStatus;

  /*
   * ------------------------------------------------
   * INDEXING
   * ------------------------------------------------
   */

  indexingStatus: ChunkIndexingStatus;

  createdAt: Date;

  updatedAt: Date;
}

/*
 * --------------------------------------------------
 * SCHEMA
 * --------------------------------------------------
 */

const documentChunkSchema =
  new Schema<IDocumentChunk>(
    {
      /*
       * ----------------------------------------------
       * DOCUMENT
       * ----------------------------------------------
       */

      documentId: {
        type: Schema.Types.ObjectId,
        ref: "Document",
        required: true,
      },

      /*
       * ----------------------------------------------
       * HIERARCHY
       * ----------------------------------------------
       *
       * null for parent chunks.
       *
       * Child chunks reference their parent chunk.
       */

      parentChunkId: {
        type: Schema.Types.ObjectId,
        ref: "DocumentChunk",
        default: null,
      },

      chunkType: {
        type: String,
        enum: [
          "parent",
          "child",
        ],
        required: true,
      },

      /*
       * ----------------------------------------------
       * CONTENT
       * ----------------------------------------------
       */

      text: {
        type: String,
        required: true,
        trim: true,
      },

      /*
       * ----------------------------------------------
       * SEMANTIC LOCATION
       * ----------------------------------------------
       *
       * Example:
       *
       * [
       *   "PROJECTS",
       *   "NexSyncHub | Real-Time Collaborative SaaS Platform"
       * ]
       */

      sectionPath: {
        type: [String],
        required: true,
        default: [],
      },

      /*
       * ----------------------------------------------
       * PROVENANCE
       * ----------------------------------------------
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
       * ----------------------------------------------
       * DOCUMENT CONTEXT
       * ----------------------------------------------
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
       * ----------------------------------------------
       * EMBEDDING
       * ----------------------------------------------
       *
       * The actual embedding vector is intentionally
       * NOT stored yet.
       *
       * For V1:
       *
       * Provider:
       * OpenAI
       *
       * Model:
       * text-embedding-3-small
       *
       * Dimensions:
       * 1536
       *
       * These fields let us track which model/version
       * generated a chunk's embedding.
       */

      embedding: {
        type: [Number],
        default: null,
      },


      embeddingModel: {
        type: String,
        default: null,
        trim: true,
      },

      embeddingDimensions: {
        type: Number,
        default: null,
        min: 1,
      },

      embeddingStatus: {
        type: String,
        enum: [
          "NOT_STARTED",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
        ],
        required: true,
        default: "NOT_STARTED",
      },

      /*
       * ----------------------------------------------
       * INDEXING
       * ----------------------------------------------
       *
       * This is intentionally separate from embedding.
       *
       * A chunk may have a completed embedding but
       * not yet be indexed in Atlas Vector Search.
       */

      indexingStatus: {
        type: String,
        enum: [
          "NOT_STARTED",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
        ],
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
 */

/*
 * Find all chunks belonging to a document.
 */

documentChunkSchema.index({
  documentId: 1,
});

/*
 * Find children belonging to a parent chunk.
 */

documentChunkSchema.index({
  parentChunkId: 1,
});

/*
 * Find chunks waiting for embedding.
 */

documentChunkSchema.index({
  embeddingStatus: 1,
});

/*
 * Find chunks waiting for indexing.
 */

documentChunkSchema.index({
  indexingStatus: 1,
});

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).DocumentChunk;
}

export const DocumentChunk: Model<IDocumentChunk> =
  mongoose.models.DocumentChunk ||
  mongoose.model<IDocumentChunk>(
    "DocumentChunk",
    documentChunkSchema
  );