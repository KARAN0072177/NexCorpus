import type {
  ContentBlock,
  IProcessedDocument,
} from "../../models/processed-document.model";

export interface ProcessorSource {
  documentId: string;
  filename: string;
  mimeType: string;
  extension: string;
}

export interface ProcessedContent {
  source: {
    filename: string;
    mimeType: string;
  };

  metadata: {
    pageCount?: number;
  };

  blocks: ContentBlock[];
}

export interface DocumentProcessor {
  supports(source: ProcessorSource): boolean;

  process(
    file: Buffer,
    source: ProcessorSource
  ): Promise<ProcessedContent>;
}

export type ProcessorResult = Omit<
  IProcessedDocument,
  "documentId" | "createdAt" | "updatedAt"
>;