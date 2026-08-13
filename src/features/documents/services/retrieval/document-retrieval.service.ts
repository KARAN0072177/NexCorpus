import {
  openAIEmbeddingProvider,
} from "../embedding/providers/openai.embedding.provider";

import {
  mongoDBVectorSearchService,
  type VectorSearchResult,
} from "./vector/mongodb-vector-search.service";

/*
 * --------------------------------------------------
 * TYPES
 * --------------------------------------------------
 */

export interface DocumentRetrievalOptions {
  documentId: string;

  query: string;

  limit?: number;

  numCandidates?: number;
}

export interface DocumentRetrievalResult {
  query: string;

  results: VectorSearchResult[];
}

/*
 * --------------------------------------------------
 * SERVICE
 * --------------------------------------------------
 */

export class DocumentRetrievalService {
  async retrieve({
    documentId,
    query,
    limit = 5,
    numCandidates,
  }: DocumentRetrievalOptions): Promise<DocumentRetrievalResult> {
    /*
     * ------------------------------------------------
     * Validate query
     * ------------------------------------------------
     */

    const normalizedQuery =
      query.trim();

    if (!normalizedQuery) {
      throw new Error(
        "Search query cannot be empty"
      );
    }

    /*
     * ------------------------------------------------
     * Generate query embedding
     * ------------------------------------------------
     *
     * IMPORTANT:
     *
     * We use the SAME embedding provider and model
     * that was used when generating document chunk
     * embeddings.
     *
     * text-embedding-3-small
     * 1536 dimensions
     * ------------------------------------------------
     */

    const queryVector =
      await openAIEmbeddingProvider.embed(
        normalizedQuery
      );

    /*
     * ------------------------------------------------
     * Search MongoDB Atlas Vector Search
     * ------------------------------------------------
     */

    const results =
      await mongoDBVectorSearchService.search({
        documentId,

        queryVector,

        limit,

        numCandidates,
      });

    /*
     * ------------------------------------------------
     * Return retrieval result
     * ------------------------------------------------
     */

    return {
      query: normalizedQuery,

      results,
    };
  }
}

/*
 * --------------------------------------------------
 * SINGLETON
 * --------------------------------------------------
 */

export const documentRetrievalService =
  new DocumentRetrievalService();