import mongoose from "mongoose";

import {
  ProcessedDocument,
  type ContentBlock,
} from "../../models/processed-document.model";

import {
  DocumentAIAnalysis,
  type IDocumentAISection,
} from "../../models/document-ai-analysis.model";

import {
  DocumentChunk,
} from "../../models/document-chunk.model";

interface CanonicalBlock {
  id: string;
  type: ContentBlock["type"];
  text: string;
  page: number;
  level?: number;
}

interface ChunkBuildResult {
  parentsCreated: number;
  childrenCreated: number;
  totalCreated: number;
}

const TARGET_CHILD_WORDS = 350;
const MAX_CHILD_WORDS = 500;

export class DocumentChunkService {
  async createChunks(
    documentId: string
  ): Promise<ChunkBuildResult> {
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
     * Load canonical processed document
     * --------------------------------------------------
     */

    const processedDocument =
      await ProcessedDocument.findOne({
        documentId: objectId,
      }).lean();

    if (!processedDocument) {
      throw new Error(
        "Processed document not found"
      );
    }

    /*
     * --------------------------------------------------
     * Load AI semantic analysis
     * --------------------------------------------------
     */

    const aiAnalysis =
      await DocumentAIAnalysis.findOne({
        documentId: objectId,
      }).lean();

    if (!aiAnalysis) {
      throw new Error(
        "Document AI analysis not found"
      );
    }

    if (
      !processedDocument.blocks ||
      processedDocument.blocks.length === 0
    ) {
      throw new Error(
        "Processed document contains no blocks"
      );
    }

    /*
     * --------------------------------------------------
     * Build canonical block lookup
     * --------------------------------------------------
     */

    const blockMap =
      new Map<string, CanonicalBlock>();

    for (const block of processedDocument.blocks) {
      blockMap.set(block.id, {
        id: block.id,
        type: block.type,
        text: this.getBlockText(block),
        page: block.page ?? 1,
        level:
          block.type === "heading"
            ? block.level
            : undefined,
      });
    }

    /*
     * --------------------------------------------------
     * Remove previous chunks
     *
     * This makes the operation idempotent.
     * --------------------------------------------------
     */

    await DocumentChunk.deleteMany({
      documentId: objectId,
    });

    let parentsCreated = 0;
    let childrenCreated = 0;

    /*
     * --------------------------------------------------
     * Process top-level semantic sections
     * --------------------------------------------------
     */

    for (const section of aiAnalysis.sections) {
      const result =
        await this.processSection({
          documentId: objectId,
          section,
          blockMap,
          documentType:
            aiAnalysis.documentType,
          language:
            aiAnalysis.language ?? null,
        });

      parentsCreated +=
        result.parentsCreated;

      childrenCreated +=
        result.childrenCreated;
    }

    return {
      parentsCreated,
      childrenCreated,
      totalCreated:
        parentsCreated +
        childrenCreated,
    };
  }

  private async processSection({
    documentId,
    section,
    blockMap,
    documentType,
    language,
    parentChunkId = null,
    parentPath = [],
  }: {
    documentId: mongoose.Types.ObjectId;
    section: IDocumentAISection;
    blockMap: Map<
      string,
      CanonicalBlock
    >;
    documentType: string;
    language: string | null;
    parentChunkId?: mongoose.Types.ObjectId | null;
    parentPath?: string[];
  }): Promise<ChunkBuildResult> {
    let parentsCreated = 0;
    let childrenCreated = 0;

    const sectionPath = [
      ...parentPath,
      section.title,
    ];

    /*
     * --------------------------------------------------
     * Resolve source blocks
     * --------------------------------------------------
     */

    const resolvedBlocks =
      this.resolveBlocks(
        section.sourceBlockIds,
        blockMap
      );

    /*
     * --------------------------------------------------
     * Determine whether this section needs
     * a parent container.
     *
     * A section with children becomes a parent.
     *
     * A large section also becomes a parent so
     * its content can be split into children.
     * --------------------------------------------------
     */

    const requiresParent =
      section.children.length > 0 ||
      this.countWords(
        resolvedBlocks
      ) > MAX_CHILD_WORDS;

    let currentParentId =
      parentChunkId;

    if (requiresParent) {
      const parent =
        await this.createParentChunk({
          documentId,
          section,
          blocks: resolvedBlocks,
          sectionPath,
          documentType,
          language,
          parentChunkId,
        });

      currentParentId =
        parent._id as mongoose.Types.ObjectId;

      parentsCreated++;
    }

    /*
     * --------------------------------------------------
     * Create content children
     *
     * A section only creates child chunks directly from
     * its own source blocks if it has NO sub-sections.
     *
     * If a section HAS sub-sections, its own source blocks
     * serve as structural context for the parent chunk,
     * while the sub-sections become the child chunks.
     * --------------------------------------------------
     */

    if (section.children.length === 0 && resolvedBlocks.length > 0) {
      const childGroups =
        this.buildChildGroups(
          resolvedBlocks
        );

      for (const group of childGroups) {
        const child =
          await this.createChildChunk({
            documentId,
            blocks: group,
            sectionPath,
            documentType,
            language,
            parentChunkId:
              currentParentId,
          });

        if (child) {
          childrenCreated++;
        }
      }
    }

    /*
     * --------------------------------------------------
     * Recursively process AI subsections.
     * --------------------------------------------------
     */

    for (const childSection of section.children) {
      const result =
        await this.processSection({
          documentId,
          section: childSection,
          blockMap,
          documentType,
          language,
          parentChunkId:
            currentParentId,
          parentPath: sectionPath,
        });

      parentsCreated +=
        result.parentsCreated;

      childrenCreated +=
        result.childrenCreated;
    }

    return {
      parentsCreated,
      childrenCreated,
      totalCreated:
        parentsCreated +
        childrenCreated,
    };
  }

  private resolveBlocks(
    blockIds: string[],
    blockMap: Map<
      string,
      CanonicalBlock
    >
  ): CanonicalBlock[] {
    const blocks: CanonicalBlock[] = [];

    for (const blockId of blockIds) {
      const block =
        blockMap.get(blockId);

      if (!block) {
        throw new Error(
          `Chunking failed: source block not found: ${blockId}`
        );
      }

      blocks.push(block);
    }

    return blocks;
  }

  private async createParentChunk({
    documentId,
    section,
    blocks,
    sectionPath,
    documentType,
    language,
    parentChunkId,
  }: {
    documentId: mongoose.Types.ObjectId;
    section: IDocumentAISection;
    blocks: CanonicalBlock[];
    sectionPath: string[];
    documentType: string;
    language: string | null;
    parentChunkId:
      | mongoose.Types.ObjectId
      | null;
  }) {
    /*
     * Parent text is contextual text.
     *
     * We use canonical source blocks and do not
     * ask the AI to generate a summary.
     */

    const text =
      this.buildText(blocks);

    const pageRange =
      this.getPageRange(blocks);

    return DocumentChunk.create({
      documentId,

      parentChunkId,

      chunkType: "parent",

      text: text || section.title,

      sectionPath,

      sourceBlockIds:
        blocks.map(
          (block) => block.id
        ),

      pageStart:
        pageRange.pageStart,

      pageEnd:
        pageRange.pageEnd,

      documentType,

      language,

      embeddingStatus:
        "NOT_STARTED",

      indexingStatus:
        "NOT_STARTED",
    });
  }

  private async createChildChunk({
    documentId,
    blocks,
    sectionPath,
    documentType,
    language,
    parentChunkId,
  }: {
    documentId: mongoose.Types.ObjectId;
    blocks: CanonicalBlock[];
    sectionPath: string[];
    documentType: string;
    language: string | null;
    parentChunkId:
      | mongoose.Types.ObjectId
      | null;
  }) {
    if (blocks.length === 0) {
      return null;
    }

    const text =
      this.buildText(blocks);

    if (!text) {
      return null;
    }

    const pageRange =
      this.getPageRange(blocks);

    return DocumentChunk.create({
      documentId,

      parentChunkId,

      chunkType: "child",

      text,

      sectionPath,

      sourceBlockIds:
        blocks.map(
          (block) => block.id
        ),

      pageStart:
        pageRange.pageStart,

      pageEnd:
        pageRange.pageEnd,

      documentType,

      language,

      embeddingStatus:
        "NOT_STARTED",

      indexingStatus:
        "NOT_STARTED",
    });
  }

  private buildChildGroups(
    blocks: CanonicalBlock[]
  ): CanonicalBlock[][] {
    if (blocks.length === 0) {
      return [];
    }

    const groups: CanonicalBlock[][] = [];

    let currentGroup: CanonicalBlock[] =
      [];

    let currentWords = 0;

    for (const block of blocks) {
      const blockWords =
        this.countWordsInText(
          block.text
        );

      /*
       * If a single block itself exceeds the
       * maximum, keep it intact for now.
       *
       * We don't split individual canonical
       * blocks because doing so could destroy
       * their source-level semantic integrity.
       */

      if (
        blockWords > MAX_CHILD_WORDS
      ) {
        if (
          currentGroup.length > 0
        ) {
          groups.push(
            currentGroup
          );

          currentGroup = [];
          currentWords = 0;
        }

        groups.push([block]);

        continue;
      }

      /*
       * Start a new group when adding the
       * next block would exceed our target.
       */

      if (
        currentGroup.length > 0 &&
        currentWords + blockWords >
          TARGET_CHILD_WORDS
      ) {
        groups.push(
          currentGroup
        );

        currentGroup = [];
        currentWords = 0;
      }

      currentGroup.push(block);

      currentWords += blockWords;
    }

    if (
      currentGroup.length > 0
    ) {
      groups.push(
        currentGroup
      );
    }

    return groups;
  }

  private buildText(
    blocks: CanonicalBlock[]
  ): string {
    return blocks
      .map((block) => block.text)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private getBlockText(
    block: ContentBlock
  ): string {
    if ("text" in block) {
      return block.text;
    }

    if (block.type === "list") {
      return block.items.join("\n");
    }

    if (block.type === "table") {
      return [
        block.headers.join(" | "),
        ...block.rows.map((row) =>
          row.join(" | ")
        ),
      ].join("\n");
    }

    return "";
  }

  private countWords(
    blocks: CanonicalBlock[]
  ): number {
    return blocks.reduce(
      (total, block) =>
        total +
        this.countWordsInText(
          block.text
        ),
      0
    );
  }

  private countWordsInText(
    text: string
  ): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  private getPageRange(
    blocks: CanonicalBlock[]
  ) {
    if (blocks.length === 0) {
      return {
        pageStart: 1,
        pageEnd: 1,
      };
    }

    const pages =
      blocks.map(
        (block) => block.page
      );

    return {
      pageStart: Math.min(...pages),
      pageEnd: Math.max(...pages),
    };
  }
}

export const documentChunkService =
  new DocumentChunkService();