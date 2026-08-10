import mongoose from "mongoose";

import { Document } from "../../models/document.model";
import { ProcessedDocument } from "../../models/processed-document.model";
import { documentStructureService } from "./document-structure.service";
import { documentMetadataService } from "./document-metadata.service";
import { createDocumentAIService } from "./ai/document-ai.service";
import { openAIProvider } from "./ai/providers/openai.provider";

export class DocumentAnalysisService {
  private readonly aiService = createDocumentAIService(openAIProvider);

  async analyzeDocument(documentId: string) {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new Error("Invalid document ID");
    }

    const document = await Document.findById(documentId);

    if (!document) {
      throw new Error("Document not found");
    }

    if (document.processingStatus !== "COMPLETED") {
      throw new Error("Document processing is not completed");
    }

    const processedDocument = await ProcessedDocument.findOne({
      documentId: document._id,
    });

    if (!processedDocument) {
      throw new Error("Processed document content not found");
    }

    /*
     * --------------------------------------------------
     * STEP 1
     * Deterministic structure analysis
     * --------------------------------------------------
     */

    const structure =
      await documentStructureService.analyze(
        processedDocument
      );

    /*
     * --------------------------------------------------
     * STEP 2
     * Deterministic metadata analysis
     * --------------------------------------------------
     */

    const metadata =
      await documentMetadataService.analyze(
        processedDocument,
        structure
      );

    /*
     * --------------------------------------------------
     * STEP 3
     * AI document understanding
     *
     * The AI receives the canonical
     * ProcessedDocument blocks.
     *
     * The AI result is NOT persisted or
     * allowed to overwrite deterministic
     * analysis yet.
     * --------------------------------------------------
     */

    const aiAnalysis =
      await this.aiService.analyzeDocument(
        processedDocument
      );

    /*
     * --------------------------------------------------
     * Return all analysis layers.
     * --------------------------------------------------
     */

    return {
      structure,
      metadata,
      aiAnalysis,
    };
  }
}

export const documentAnalysisService =
  new DocumentAnalysisService();