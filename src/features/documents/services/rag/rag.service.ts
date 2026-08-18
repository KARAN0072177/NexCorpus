import { contextAssemblerService } from "./context/context-assembler.service";
import { openAIGenerationProvider } from "./generation/openai-generation.provider";
import { documentRetrievalService } from "../retrieval/document-retrieval.service";
import type { HybridSearchResult } from "../retrieval/hybrid/mongodb-hybrid-search.service";

export interface AskDocumentInput {
  documentId: string;
  query: string;
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
  }: AskDocumentInput): Promise<AskDocumentResult> {
    if (!documentId) {
      throw new Error("Document ID is required");
    }

    if (!query?.trim()) {
      throw new Error("Query is required");
    }

    // 1. Retrieve relevant chunks using hybrid retrieval
    const retrievalResult = await documentRetrievalService.retrieve({
      documentId,
      query: query.trim(),
    });

    if (!retrievalResult.results.length) {
      return {
        answer: "I couldn't find relevant information in the document.",
        sources: [],
      };
    }

    // 2. Convert retrieval results into LLM context
    const context = contextAssemblerService.assemble(retrievalResult.results);

    // 3. Generate grounded answer
    const answer = await openAIGenerationProvider.generateAnswer({
      query: query.trim(),
      context: context.text,
    });

    // 4. Return answer + source metadata
    return {
      answer,
      sources: retrievalResult.results.map((result: HybridSearchResult) => ({
        id: result.id,
        sectionPath: result.sectionPath,
        pageStart: result.pageStart,
        pageEnd: result.pageEnd,
        score: result.score,
      })),
    };
  }
}

export const ragService = new RagService();