import mongoose from "mongoose";
import { DocumentChunk } from "../../models/document-chunk.model";
import { Document } from "../../models/document.model";
import {
  openAIEmbeddingProvider,
  OPENAI_EMBEDDING_MODEL,
  OPENAI_EMBEDDING_DIMENSIONS,
} from "./providers/openai.embedding.provider";

const EMBEDDING_BATCH_SIZE = 50;

export interface EmbedDocumentResult {
  documentId: string;
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
}

export class DocumentEmbeddingService {
  async embedDocument(
    documentId: string
  ): Promise<EmbedDocumentResult> {
    if (
      !mongoose.Types.ObjectId.isValid(
        documentId
      )
    ) {
      throw new Error(
        "Invalid document ID"
      );
    }

    const objectId =
      new mongoose.Types.ObjectId(
        documentId
      );

    /*
     * --------------------------------------------------
     * Only child chunks are retrieval units.
     * --------------------------------------------------
     */
    const chunks =
      await DocumentChunk.find({
        documentId: objectId,
        chunkType: "child",
      });

    if (chunks.length === 0) {
      return {
        documentId,
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
      };
    }

    let completed = 0;
    let failed = 0;
    let skipped = 0;

    for (
      let index = 0;
      index < chunks.length;
      index += EMBEDDING_BATCH_SIZE
    ) {
      const batch =
        chunks.slice(
          index,
          index + EMBEDDING_BATCH_SIZE
        );

      const chunksToEmbed = [];

      for (const chunk of batch) {
        if (
          chunk.embeddingStatus ===
            "COMPLETED" &&
          chunk.embeddingModel ===
            OPENAI_EMBEDDING_MODEL &&
          chunk.embeddingDimensions ===
            OPENAI_EMBEDDING_DIMENSIONS &&
          chunk.embedding?.length ===
            OPENAI_EMBEDDING_DIMENSIONS
        ) {
          skipped++;
          continue;
        }

        if (
          !chunk.text ||
          !chunk.text.trim()
        ) {
          chunk.embeddingStatus =
            "FAILED";
          await chunk.save();
          failed++;
          continue;
        }

        chunk.embeddingStatus =
          "PROCESSING";
        await chunk.save();
        chunksToEmbed.push(chunk);
      }

      if (chunksToEmbed.length === 0) {
        continue;
      }

      try {
        const embeddings =
          await openAIEmbeddingProvider.embedMany(
            chunksToEmbed.map(
              (chunk) => chunk.text
            )
          );

        for (
          let i = 0;
          i < chunksToEmbed.length;
          i++
        ) {
          const chunk = chunksToEmbed[i];
          const embedding = embeddings[i];

          if (
            !embedding ||
            embedding.length !==
              OPENAI_EMBEDDING_DIMENSIONS
          ) {
            chunk.embeddingStatus =
              "FAILED";
            await chunk.save();
            failed++;
            continue;
          }

          chunk.embedding = embedding;
          chunk.embeddingModel =
            OPENAI_EMBEDDING_MODEL;
          chunk.embeddingDimensions =
            OPENAI_EMBEDDING_DIMENSIONS;
          chunk.embeddingStatus =
            "COMPLETED";
          chunk.indexingStatus =
            "COMPLETED";
          await chunk.save();

          completed++;
        }
      } catch (error) {
        console.error(
          "Embedding batch failed:",
          error
        );

        for (const chunk of chunksToEmbed) {
          chunk.embeddingStatus =
            "FAILED";
          await chunk.save();
          failed++;
        }
      }
    }

    /*
     * --------------------------------------------------
     * Update parent Document status to COMPLETED
     * --------------------------------------------------
     */
    if (completed > 0 || skipped > 0) {
      await Document.updateOne(
        { _id: objectId },
        {
          $set: {
            processingStatus: "COMPLETED",
            indexingStatus: "COMPLETED",
          },
        }
      );
    }

    return {
      documentId,
      processed: completed + failed,
      completed,
      failed,
      skipped,
    };
  }
}

export const documentEmbeddingService =
  new DocumentEmbeddingService();