import {
  DocumentStructure,
  type IDocumentStructureSection,
} from "../../models/document-structure.model";

import type {
  ContentBlock,
  IProcessedDocument,
} from "../../models/processed-document.model";

export class DocumentStructureService {
  async analyze(
    processedDocument: IProcessedDocument
  ) {
    const sections =
      this.buildSections(
        processedDocument.blocks
      );

    return DocumentStructure.findOneAndUpdate(
      {
        documentId:
          processedDocument.documentId,
      },
      {
        documentId:
          processedDocument.documentId,

        sections,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );
  }

  private buildSections(
    blocks: ContentBlock[]
  ): IDocumentStructureSection[] {
    const sections: IDocumentStructureSection[] = [];

    /*
     * Stack containing the currently active
     * section hierarchy.
     *
     * Example:
     *
     * H2 PROJECTS
     * H3 NexSyncHub
     *
     * stack:
     *
     * [
     *   PROJECTS,
     *   NexSyncHub
     * ]
     */

    const stack: IDocumentStructureSection[] =
      [];

    for (const block of blocks) {
      /*
       * Non-heading blocks belong to the
       * currently active section.
       */

      if (block.type !== "heading") {
        const currentSection =
          stack[stack.length - 1];

        if (currentSection) {
          currentSection.sourceBlockIds.push(
            block.id
          );
        }

        continue;
      }

      /*
       * A new heading starts a new section.
       */

      const newSection: IDocumentStructureSection =
        {
          title: block.text,
          level: block.level,
          sourceBlockIds: [],
          children: [],
        };

      /*
       * Remove sections from the stack until
       * we find the correct parent level.
       *
       * Example:
       *
       * H2 PROJECTS
       * H3 NexSyncHub
       * H3 AOIE
       *
       * AOIE becomes a sibling of NexSyncHub.
       */

      while (
        stack.length > 0 &&
        stack[stack.length - 1].level >=
          newSection.level
      ) {
        stack.pop();
      }

      const parent =
        stack[stack.length - 1];

      if (parent) {
        parent.children.push(
          newSection
        );
      } else {
        sections.push(newSection);
      }

      stack.push(newSection);
    }

    return sections;
  }
}

export const documentStructureService =
  new DocumentStructureService();