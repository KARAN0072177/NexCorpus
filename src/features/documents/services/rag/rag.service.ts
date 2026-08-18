import { contextAssemblerService } from "./context/context-assembler.service";
import { openAIGenerationProvider } from "./generation/openai-generation.provider";
import { openAIQueryRewriterProvider } from "./query/openai-query-rewriter.provider";
import { documentRetrievalService } from "../retrieval/document-retrieval.service";
import type { HybridSearchResult } from "../retrieval/hybrid/mongodb-hybrid-search.service";
import { ragCacheService } from "./cache/rag-cache.service";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskDocumentInput {
  documentId: string;
  query: string;
  conversation?: ConversationMessage[];
}

export interface AskDocumentResult {
  answer: string;
  sources: {
    id: string;
    sectionPath: string[];
    pageStart: number;
    pageEnd: number;
    score: number;
  }[];
}

export class RagService {
  async askDocument({
    documentId,
    query,
    conversation = [],
  }: AskDocumentInput): Promise<AskDocumentResult> {
    if (!documentId) {
      throw new Error("Document ID is required");
    }

    if (!query?.trim()) {
      throw new Error("Query is required");
    }

    const currentQuery = query.trim();

    /*
     * --------------------------------------------------
     * Step 0: In-Memory / TTL Cache Lookup (<10ms Response)
     * --------------------------------------------------
     */
    const cachedResult = ragCacheService.get(documentId, currentQuery, conversation);
    if (cachedResult) {
      console.log(`[RagService] Cache HIT for document ${documentId}`);
      return cachedResult;
    }

    // 1. Rewrite the query and classify intent (Fast-Path Regex Bypass applied internally)
    const rewrittenQueryResult =
      await openAIQueryRewriterProvider.rewriteQuery({
        query: currentQuery,
        conversation,
      });

    const targetQuery = rewrittenQueryResult.query;
    const intent = rewrittenQueryResult.intent;

    // 2. Intent-Aware Evidence Collection
    let results: HybridSearchResult[] = [];

    if (intent === "EXHAUSTIVE") {
      const primaryRetrieval =
        await documentRetrievalService.retrieve({
          documentId,
          query: targetQuery,
          limit: 15,
        });

      const structuralPass =
        await documentRetrievalService.retrieve({
          documentId,
          query:
            "technical skills projects authentication security cloud database stack",
          limit: 10,
        });

      const resultMap = new Map<string, HybridSearchResult>();

      [
        ...primaryRetrieval.results,
        ...structuralPass.results,
      ].forEach((item) => {
        resultMap.set(item.id, item);
      });

      results = Array.from(resultMap.values());
    } else if (
      intent === "COMPARISON" ||
      intent === "SET_DIFFERENCE"
    ) {
      const primaryPass =
        await documentRetrievalService.retrieve({
          documentId,
          query: targetQuery,
          limit: 10,
        });

      const structuralPass =
        await documentRetrievalService.retrieve({
          documentId,
          query:
            "technical skills projects stack architecture authentication security",
          limit: 10,
        });

      const resultMap = new Map<string, HybridSearchResult>();

      [
        ...primaryPass.results,
        ...structuralPass.results,
      ].forEach((item) => {
        resultMap.set(item.id, item);
      });

      results = Array.from(resultMap.values());
    } else {
      const primaryRetrieval =
        await documentRetrievalService.retrieve({
          documentId,
          query: targetQuery,
          limit: 5,
        });

      results = primaryRetrieval.results;
    }

    if (!results.length) {
      const emptyResult: AskDocumentResult = {
        answer: "I couldn't find relevant information in the document.",
        sources: [],
      };
      ragCacheService.set(documentId, currentQuery, conversation, emptyResult);
      return emptyResult;
    }

    // 3. Convert retrieval results into LLM context with Deduplication & Context Budgeting
    const assembledContext = contextAssemblerService.assembleContext(results);

    // 4. Generate grounded answer
    const generatedAnswer =
      await openAIGenerationProvider.generateAnswer({
        query: targetQuery,
        context: assembledContext.formattedContext,
      });

    // 5. Map OpenAI SOURCE numbers back to actual retrieved chunks
    const sourceMap = new Map<number, HybridSearchResult>();
    assembledContext.chunks.forEach((chunk, index) => {
      sourceMap.set(index + 1, chunk);
    });

    const sources = generatedAnswer.citations
      .map((sourceNumber) => {
        const resultChunk = sourceMap.get(sourceNumber);
        if (!resultChunk) return null;

        return {
          id: resultChunk.id,
          sectionPath: resultChunk.sectionPath,
          pageStart: resultChunk.pageStart,
          pageEnd: resultChunk.pageEnd,
          score: resultChunk.score,
        };
      })
      .filter(
        (source): source is AskDocumentResult["sources"][number] =>
          source !== null
      );

    const uniqueSources = Array.from(
      new Map(sources.map((source) => [source.id, source])).values()
    );

    const finalResult: AskDocumentResult = {
      answer: generatedAnswer.answer,
      sources: uniqueSources,
    };

    // Store in Cache
    ragCacheService.set(documentId, currentQuery, conversation, finalResult);

    return finalResult;
  }
}

export const ragService = new RagService();