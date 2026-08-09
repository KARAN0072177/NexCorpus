import mongoose from "mongoose";

import { Document } from "../../models/document.model";
import { ProcessedDocument } from "../../models/processed-document.model";
import { documentStructureService } from "./document-structure.service";
import { documentMetadataService } from "./document-metadata.service";

export class DocumentAnalysisService {
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
     * Step 1:
     *
     * Build the deterministic document
     * hierarchy from the processed blocks.
     */

    const structure =
      await documentStructureService.analyze(
        processedDocument
      );

    /*
     * Step 2:
     *
     * Derive document-level metadata from
     * the processed content and structure.
     */

    const metadata =
      await documentMetadataService.analyze(
        processedDocument,
        structure
      );

    return {
      structure,
      metadata,
    };
  }
}

export const documentAnalysisService =
  new DocumentAnalysisService();