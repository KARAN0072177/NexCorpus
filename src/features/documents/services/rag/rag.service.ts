import { contextAssemblerService } from "./context/context-assembler.service";
import { openAIGenerationProvider } from "./generation/openai-generation.provider";
import { openAIQueryRewriterProvider } from "./query/openai-query-rewriter.provider";
import { documentRetrievalService } from "../retrieval/document-retrieval.service";
import type { HybridSearchResult } from "../retrieval/hybrid/mongodb-hybrid-search.service";

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

    // 1. Rewrite the query and classify intent
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
      // Multi-pass evidence collection for document-wide category sweeps
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

      const resultMap = new Map<
        string,
        HybridSearchResult
      >();

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
      // Multi-Pass Grouped Retrieval for relational set-difference and multi-entity matrices
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

      const resultMap = new Map<
        string,
        HybridSearchResult
      >();

      [
        ...primaryPass.results,
        ...structuralPass.results,
      ].forEach((item) => {
        resultMap.set(item.id, item);
      });

      results = Array.from(resultMap.values());
    } else {
      // Standard TARGETED mode (limit = 5) for single-topic precision
      const primaryRetrieval =
        await documentRetrievalService.retrieve({
          documentId,
          query: targetQuery,
          limit: 5,
        });

      results = primaryRetrieval.results;
    }

    if (!results.length) {
      return {
        answer:
          "I couldn't find relevant information in the document.",
        sources: [],
      };
    }

    // 3. Convert retrieval results into LLM context
    const context =
      contextAssemblerService.assemble(results);

    // 4. Generate grounded answer using the explicit standalone query
    const generatedAnswer =
      await openAIGenerationProvider.generateAnswer({
        query: targetQuery,
        context: context.text,
      });

    // 5. Map OpenAI SOURCE numbers back to actual retrieved chunks
    const sources =
      generatedAnswer.citations
        .map((sourceNumber) => {
          const index = sourceNumber - 1;

          return results[index];
        })
        .filter(
          (
            result
          ): result is HybridSearchResult =>
            Boolean(result)
        );

    // 6. Remove duplicate sources
    const uniqueSources =
      Array.from(
        new Map(
          sources.map((source) => [
            source.id,
            source,
          ])
        ).values()
      );

    // 7. Return grounded answer + cited source metadata
    return {
      answer: generatedAnswer.answer,

      sources: uniqueSources.map(
        (result: HybridSearchResult) => ({
          id: result.id,
          sectionPath:
            result.sectionPath,
          pageStart:
            result.pageStart,
          pageEnd:
            result.pageEnd,
          score: result.score,
        })
      ),
    };
  }
}

export const ragService =
  new RagService();