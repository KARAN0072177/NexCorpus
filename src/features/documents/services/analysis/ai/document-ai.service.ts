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
    const validBlockIds = new Set(
      processedDocument.blocks.map((block) => block.id)
    );

    const firstValidId = validBlockIds.values().next().value;

    if (result.titleBlockId && !validBlockIds.has(result.titleBlockId)) {
      console.warn(
        `[DocumentAIService] AI returned invalid titleBlockId: ${result.titleBlockId}. Remapping to first valid block.`
      );
      result.titleBlockId = firstValidId ?? null;
    }

    const sanitizeSections = (
      sections: DocumentAIResult["sections"]
    ) => {
      for (const section of sections) {
        if (!validBlockIds.has(section.titleBlockId)) {
          console.warn(
            `[DocumentAIService] AI returned invalid section titleBlockId: ${section.titleBlockId}. Remapping.`
          );
          if (firstValidId) {
            section.titleBlockId = firstValidId;
          }
        }

        section.sourceBlockIds = section.sourceBlockIds.filter((blockId) =>
          validBlockIds.has(blockId)
        );

        if (section.children && section.children.length > 0) {
          sanitizeSections(section.children);
        }
      }
    };

    sanitizeSections(result.sections);
  }
}

export function createDocumentAIService(
  provider: DocumentAIProvider
) {
  return new DocumentAIService(
    provider
  );
}