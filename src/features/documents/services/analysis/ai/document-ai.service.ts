import type {
  ContentBlock,
  IProcessedDocument,
} from "../../../models/processed-document.model";

import type {
  DocumentAIInput,
  DocumentAIProvider,
} from "./document-ai.types";

import type {
  DocumentAIResult,
} from "./document-ai.schema";

export class DocumentAIService {
  constructor(
    private readonly provider: DocumentAIProvider
  ) {}

  async analyzeDocument(
    processedDocument: IProcessedDocument
  ): Promise<DocumentAIResult> {
    const input =
      this.buildInput(
        processedDocument
      );

    const result =
      await this.provider.analyzeDocument(
        input
      );

    this.validateBlockReferences(
      result,
      processedDocument
    );

    return result;
  }

  private buildInput(
    processedDocument: IProcessedDocument
  ): DocumentAIInput {
    return {
      blocks: processedDocument.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        text: this.getBlockText(block),
        level: block.type === "heading" ? block.level : undefined,
        page: block.page,
      })),
    };
  }

  private getBlockText(block: ContentBlock): string | undefined {
    if ("text" in block) {
      return block.text;
    }

    if (block.type === "list") {
      return block.items.join("\n");
    }

    if (block.type === "table") {
      return [
        block.headers.join(" | "),
        ...block.rows.map((row) => row.join(" | ")),
      ].join("\n");
    }

    return undefined;
  }

  private validateBlockReferences(
    result: DocumentAIResult,
    processedDocument: IProcessedDocument
  ) {
    const validBlockIds =
      new Set(
        processedDocument.blocks.map(
          (block) => block.id
        )
      );

    /*
     * Validate the document title
     * reference.
     */

    if (
      result.titleBlockId &&
      !validBlockIds.has(
        result.titleBlockId
      )
    ) {
      throw new Error(
        `AI returned an invalid titleBlockId: ${result.titleBlockId}`
      );
    }

    /*
     * Validate every section and its
     * nested children.
     */

    const validateSections = (
      sections: DocumentAIResult["sections"]
    ) => {
      for (const section of sections) {
        /*
         * Section title must point to a
         * real canonical block.
         */

        if (
          !validBlockIds.has(
            section.titleBlockId
          )
        ) {
          throw new Error(
            `AI returned an invalid titleBlockId: ${section.titleBlockId}`
          );
        }

        /*
         * Every source block must exist
         * in ProcessedDocument.
         */

        for (const blockId of
          section.sourceBlockIds) {
          if (
            !validBlockIds.has(blockId)
          ) {
            throw new Error(
              `AI returned an invalid sourceBlockId: ${blockId}`
            );
          }
        }

        /*
         * Validate nested sections
         * recursively.
         */

        if (
          section.children.length > 0
        ) {
          validateSections(
            section.children
          );
        }
      }
    };

    validateSections(
      result.sections
    );
  }
}

export function createDocumentAIService(
  provider: DocumentAIProvider
) {
  return new DocumentAIService(
    provider
  );
}