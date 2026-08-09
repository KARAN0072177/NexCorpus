import mongoose from "mongoose";

import { Document } from "../../models/document.model";
import { ProcessedDocument } from "../../models/processed-document.model";
import { documentStructureService } from "./document-structure.service";

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


    const structure =
      await documentStructureService.analyze(
        processedDocument
      );

    return structure;
  }
}

export const documentAnalysisService =
  new DocumentAnalysisService();