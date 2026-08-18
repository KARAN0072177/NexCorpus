import mongoose from "mongoose";

import { DocumentChunk } from "@/features/documents/models/document-chunk.model";

/*
 * --------------------------------------------------
 * CONFIGURATION
 * --------------------------------------------------
 */

const VECTOR_SEARCH_INDEX =
  "document_chunks_vector_index";

const TEXT_SEARCH_INDEX =
  "document_chunks_search_index";

const VECTOR_SEARCH_PATH =
  "embedding";

const DEFAULT_LIMIT = 5;

const DEFAULT_CANDIDATE_LIMIT = 20;

const DEFAULT_NUM_CANDIDATES = 100;

/*
 * --------------------------------------------------
 * TYPES
 * --------------------------------------------------
 */

export interface HybridSearchOptions {
  documentId: string;

  query: string;

  queryVector: number[];

  limit?: number;

  candidateLimit?: number;

  numCandidates?: number;

  vectorWeight?: number;

  textWeight?: number;
}

export interface HybridSearchResult {
  id: string;

  documentId: string;

  parentChunkId:
    | string
    | null;

  chunkType:
    | "parent"
    | "child";

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

export class MongoDBHybridSearchService {
  async search({
    documentId,
    query,
    queryVector,
    limit = DEFAULT_LIMIT,
    candidateLimit = DEFAULT_CANDIDATE_LIMIT,
    numCandidates = DEFAULT_NUM_CANDIDATES,
    vectorWeight = 1,
    textWeight = 1,
  }: HybridSearchOptions): Promise<
    HybridSearchResult[]
  > {
    if (
      !mongoose.Types.ObjectId.isValid(
        documentId
      )
    ) {
      throw new Error(
        "Invalid document ID"
      );
    }

    const normalizedQuery =
      query.trim();

    if (!normalizedQuery) {
      throw new Error(
        "Search query cannot be empty"
      );
    }

    if (
      !Array.isArray(queryVector) ||
      queryVector.length !== 1536
    ) {
      throw new Error(
        "Query vector must contain exactly 1536 dimensions"
      );
    }

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
      !Number.isInteger(candidateLimit) ||
      candidateLimit < limit ||
      candidateLimit > 200
    ) {
      throw new Error(
        "Candidate limit must be between the final limit and 200"
      );
    }

    if (
      !Number.isInteger(numCandidates) ||
      numCandidates < candidateLimit
    ) {
      throw new Error(
        "numCandidates must be greater than or equal to candidateLimit"
      );
    }

    if (
      vectorWeight < 0 ||
      textWeight < 0 ||
      (vectorWeight === 0 &&
        textWeight === 0)
    ) {
      throw new Error(
        "At least one search weight must be greater than zero"
      );
    }

    const documentObjectId =
      new mongoose.Types.ObjectId(
        documentId
      );

    const pipeline = [
      {
        $rankFusion: {
          input: {
            pipelines: {
              vectorSearch: [
                {
                  $vectorSearch: {
                    index:
                      VECTOR_SEARCH_INDEX,

                    path:
                      VECTOR_SEARCH_PATH,

                    queryVector,

                    numCandidates,

                    limit:
                      candidateLimit,

                    filter: {
                      $and: [
                        {
                          documentId:
                            documentObjectId,
                        },
                        {
                          chunkType:
                            "child",
                        },
                      ],
                    },
                  },
                },
              ],

              textSearch: [
                {
                  $search: {
                    index:
                      TEXT_SEARCH_INDEX,

                    compound: {
                      must: [
                        {
                          text: {
                            query:
                              normalizedQuery,

                            path:
                              "text",
                          },
                        },
                      ],

                      filter: [
                        {
                          equals: {
                            path:
                              "documentId",

                            value:
                              documentObjectId,
                          },
                        },
                        {
                          equals: {
                            path:
                              "chunkType",

                            value:
                              "child",
                          },
                        },
                      ],
                    },
                  },
                },

                {
                  $limit:
                    candidateLimit,
                },
              ],
            },
          },

          combination: {
            weights: {
              vectorSearch:
                vectorWeight,

              textSearch:
                textWeight,
            },
          },

          scoreDetails: true,
        },
      },

      {
        $limit: limit,
      },

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
              "score",
          },

          scoreDetails: {
            $meta:
              "searchScoreDetails",
          },
        },
      },
    ];

    const results =
      await DocumentChunk.aggregate(
        pipeline as any[]
      );

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

export const mongoDBHybridSearchService =
  new MongoDBHybridSearchService();