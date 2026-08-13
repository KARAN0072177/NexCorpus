import mongoose from "mongoose";

import { DocumentChunk } from "@/features/documents/models/document-chunk.model";

/*
 * --------------------------------------------------
 * CONFIGURATION
 * --------------------------------------------------
 */

const VECTOR_SEARCH_INDEX =
  "document_chunks_vector_index";

const VECTOR_SEARCH_PATH =
  "embedding";

const DEFAULT_LIMIT = 5;

/*
 * MongoDB recommends using a larger candidate pool
 * than the final number of returned documents.
 *
 * 20x is a good V1 starting point.
 */

const DEFAULT_NUM_CANDIDATES =
  DEFAULT_LIMIT * 20;

/*
 * --------------------------------------------------
 * TYPES
 * --------------------------------------------------
 */

export interface VectorSearchOptions {
  documentId: string;

  queryVector: number[];

  limit?: number;

  numCandidates?: number;
}

export interface VectorSearchResult {
  id: string;

  documentId: string;

  parentChunkId:
    | string
    | null;

  chunkType: "parent" | "child";

  text: string;

  sectionPath: string[];

  sourceBlockIds: string[];

  pageStart: number;

  pageEnd: number;

  documentType: string;

  language: string | null;

  score: number;
}

/*
 * --------------------------------------------------
 * SERVICE
 * --------------------------------------------------
 */

export class MongoDBVectorSearchService {
  async search({
    documentId,
    queryVector,
    limit = DEFAULT_LIMIT,
    numCandidates = DEFAULT_NUM_CANDIDATES,
  }: VectorSearchOptions): Promise<
    VectorSearchResult[]
  > {
    /*
     * ------------------------------------------------
     * Validate document ID
     * ------------------------------------------------
     */

    if (
      !mongoose.Types.ObjectId.isValid(
        documentId
      )
    ) {
      throw new Error(
        "Invalid document ID"
      );
    }

    /*
     * ------------------------------------------------
     * Validate query vector
     * ------------------------------------------------
     */

    if (
      !Array.isArray(queryVector) ||
      queryVector.length !== 1536
    ) {
      throw new Error(
        "Query vector must contain exactly 1536 dimensions"
      );
    }

    /*
     * ------------------------------------------------
     * Validate search parameters
     * ------------------------------------------------
     */

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new Error(
        "Search limit must be between 1 and 100"
      );
    }

    if (
      !Number.isInteger(numCandidates) ||
      numCandidates < limit
    ) {
      throw new Error(
        "numCandidates must be greater than or equal to limit"
      );
    }

    const documentObjectId =
      new mongoose.Types.ObjectId(
        documentId
      );

    /*
     * ------------------------------------------------
     * VECTOR SEARCH
     * ------------------------------------------------
     *
     * $vectorSearch MUST be the first stage.
     *
     * We pre-filter by:
     *
     * 1. documentId
     * 2. chunkType = child
     *
     * This means structural parent chunks are never
     * considered retrieval candidates.
     * ------------------------------------------------
     */

    const pipeline = [
      {
        $vectorSearch: {
          index:
            VECTOR_SEARCH_INDEX,

          path:
            VECTOR_SEARCH_PATH,

          queryVector,

          numCandidates,

          limit,

          filter: {
            $and: [
              {
                documentId:
                  documentObjectId,
              },
              {
                chunkType: "child",
              },
            ],
          },
        },
      },

      /*
       * ------------------------------------------------
       * Return only fields required by retrieval.
       *
       * IMPORTANT:
       * Do not return the 1536-dimensional embedding.
       *
       * MongoDB recommends projecting only the fields
       * required by the application.
       * ------------------------------------------------
       */

      {
        $project: {
          _id: 1,

          documentId: 1,

          parentChunkId: 1,

          chunkType: 1,

          text: 1,

          sectionPath: 1,

          sourceBlockIds: 1,

          pageStart: 1,

          pageEnd: 1,

          documentType: 1,

          language: 1,

          score: {
            $meta:
              "vectorSearchScore",
          },
        },
      },
    ];

    /*
     * ------------------------------------------------
     * Execute aggregation
     * ------------------------------------------------
     */

    const results =
      await DocumentChunk.aggregate(
        pipeline
      );

    /*
     * ------------------------------------------------
     * Normalize MongoDB results
     * ------------------------------------------------
     */

    return results.map(
      (result) => ({
        id:
          result._id.toString(),

        documentId:
          result.documentId.toString(),

        parentChunkId:
          result.parentChunkId
            ? result.parentChunkId.toString()
            : null,

        chunkType:
          result.chunkType,

        text:
          result.text,

        sectionPath:
          result.sectionPath ?? [],

        sourceBlockIds:
          result.sourceBlockIds ?? [],

        pageStart:
          result.pageStart,

        pageEnd:
          result.pageEnd,

        documentType:
          result.documentType,

        language:
          result.language ?? null,

        score:
          result.score,
      })
    );
  }
}

/*
 * --------------------------------------------------
 * SINGLETON
 * --------------------------------------------------
 */

export const mongoDBVectorSearchService =
  new MongoDBVectorSearchService();