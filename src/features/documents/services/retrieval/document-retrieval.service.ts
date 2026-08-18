import {
  openAIEmbeddingProvider,
} from "../embedding/providers/openai.embedding.provider";

import {
  mongoDBHybridSearchService,
  type HybridSearchResult,
} from "./hybrid/mongodb-hybrid-search.service";

/*
 * --------------------------------------------------
 * TYPES
 * --------------------------------------------------
 */

export interface DocumentRetrievalOptions {
  documentId: string;

  query: string;

  limit?: number;

  candidateLimit?: number;

  numCandidates?: number;
}

export interface DocumentRetrievalResult {
  query: string;

  results: HybridSearchResult[];
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
    candidateLimit = 20,
    numCandidates = 100,
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
     */

    const queryVector =
      await openAIEmbeddingProvider.embed(
        normalizedQuery
      );

    /*
     * ------------------------------------------------
     * Hybrid Retrieval
     * ------------------------------------------------
     */

    const results =
      await mongoDBHybridSearchService.search({
        documentId,

        query: normalizedQuery,

        queryVector,

        limit,

        candidateLimit,

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