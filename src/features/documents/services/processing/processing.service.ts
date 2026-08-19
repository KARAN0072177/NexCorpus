import { connectToDatabase } from "@/lib/db/mongodb";

import { Document } from "../../models/document.model";
import { ProcessedDocument } from "../../models/processed-document.model";

import {
  getObject,
} from "../storage/s3.service";

import {
  PdfProcessor,
} from "./processors/pdf.processor";

import type {
  DocumentProcessor,
  ProcessorSource,
} from "./processor.types";

const processors: DocumentProcessor[] = [
  new PdfProcessor(),
];

function getProcessor(
  source: ProcessorSource
): DocumentProcessor {
  const processor = processors.find((processor) =>
    processor.supports(source)
  );

  if (!processor) {
    throw new Error(
      `No processor available for ${source.mimeType} (${source.extension})`
    );
  }

  return processor;
}

export async function processDocument({
  documentId,
  ownerId,
}: {
  documentId: string;
  ownerId: string;
}) {
  await connectToDatabase();

  /*
   * Find the document and enforce ownership.
   */

  const document = await Document.findOne({
    _id: documentId,
    ownerId,
  });

  if (!document) {
    throw new Error("Document not found");
  }

  /*
   * Processing can only happen after the original
   * file has successfully reached storage.
   */

  if (document.storageStatus !== "UPLOADED") {
    throw new Error(
      "Document is not ready for processing"
    );
  }

  if (!document.storageKey) {
    throw new Error(
      "Document does not have a storage key"
    );
  }

  /*
   * Prevent duplicate processing.
   */

  if (document.processingStatus === "PROCESSING") {
    throw new Error(
      "Document is already being processed"
    );
  }

  /*
   * Mark processing as started.
   */

  document.processingStatus = "PROCESSING";
  await document.save();

  try {
    /*
     * Build the source information required by
     * the processor.
     */

    const source: ProcessorSource = {
      documentId: document._id.toString(),
      filename: document.originalFilename,
      mimeType: document.mimeType,
      extension: document.extension,
    };

    /*
     * Select the appropriate processor.
     */

    const processor = getProcessor(source);

    /*
     * Retrieve the original bytes from private S3.
     */

    const file = await getObject({
      key: document.storageKey,
    });

    /*
     * Let the format-specific processor transform
     * the raw bytes into canonical content.
     */

    const processedContent = await processor.process(
      file,
      source
    );

    /*
     * Store the derived representation.
     *
     * findOneAndUpdate + upsert means reprocessing the
     * same document replaces its current processed
     * representation rather than creating duplicates.
     */

    const processedDocument =
      await ProcessedDocument.findOneAndUpdate(
        {
          documentId: document._id,
        },
        {
          $set: {
            source: processedContent.source,
            metadata: processedContent.metadata,
            blocks: processedContent.blocks,
          },
        },
        {
          returnDocument: "after",
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    /*
     * Processing completed successfully.
     */

    document.processingStatus = "COMPLETED";
    await document.save();

    return {
      document,
      processedDocument,
    };
  } catch (error) {
    /*
     * Processing failed.
     *
     * IMPORTANT:
     * We deliberately leave the original document in
     * storage. A processing failure does not mean the
     * uploaded file itself disappeared.
     */

    document.processingStatus = "FAILED";
    await document.save();

    throw error;
  }
}