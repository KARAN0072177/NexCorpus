import type {
  DocumentAIResult,
} from "./document-ai.schema";

export interface DocumentAIInput {
  blocks: Array<{
    id: string;
    type: string;
    text?: string;
    level?: number;
    page?: number;
  }>;
}

export interface DocumentAIProvider {
  analyzeDocument(
    input: DocumentAIInput
  ): Promise<DocumentAIResult>;
}