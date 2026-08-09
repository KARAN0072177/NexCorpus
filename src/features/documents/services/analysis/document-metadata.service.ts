import {
  DocumentMetadata,
  type DocumentType,
} from "../../models/document-metadata.model";

import type {
  ContentBlock,
  IProcessedDocument,
} from "../../models/processed-document.model";

import type { IDocumentStructure } from "../../models/document-structure.model";

export class DocumentMetadataService {
  async analyze(
    processedDocument: IProcessedDocument,
    structure: IDocumentStructure
  ) {
    const title = this.extractTitle(
      processedDocument.blocks
    );

    const documentType =
      this.detectDocumentType(
        structure
      );

    const language =
      this.detectLanguage(
        processedDocument.blocks
      );

    return DocumentMetadata.findOneAndUpdate(
      {
        documentId:
          processedDocument.documentId,
      },
      {
        documentId:
          processedDocument.documentId,

        title,

        documentType,

        language,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );
  }

  private extractTitle(
    blocks: ContentBlock[]
  ): string | undefined {
    /*
     * V1 title detection:
     *
     * Use the first heading block that
     * appears near the beginning of the
     * document.
     *
     * For the current resume this should
     * produce:
     *
     * "Karan Vani"
     */

    const firstHeading =
      blocks.find(
        (block) =>
          block.type === "heading"
      );

    return firstHeading?.text;
  }

  private detectDocumentType(
    structure: IDocumentStructure
  ): DocumentType {
    const sectionTitles =
      this.collectSectionTitles(
        structure.sections
      );

    const normalizedTitles =
      sectionTitles.map(
        (title) =>
          title
            .trim()
            .toLowerCase()
      );

    /*
     * Resume signals.
     */

    const resumeSignals = [
      "summary",
      "education",
      "experience",
      "projects",
      "technical skills",
      "skills",
      "certifications",
    ];

    const resumeSignalCount =
      resumeSignals.filter(
        (signal) =>
          normalizedTitles.some(
            (title) =>
              title === signal ||
              title.includes(signal)
          )
      ).length;

    if (resumeSignalCount >= 2) {
      return "resume";
    }

    /*
     * Report signals.
     */

    const reportSignals = [
      "executive summary",
      "introduction",
      "conclusion",
      "findings",
      "recommendations",
    ];

    const reportSignalCount =
      reportSignals.filter(
        (signal) =>
          normalizedTitles.some(
            (title) =>
              title === signal ||
              title.includes(signal)
          )
      ).length;

    if (reportSignalCount >= 2) {
      return "report";
    }

    /*
     * If we don't have enough confidence,
     * don't guess.
     */

    return "unknown";
  }

  private detectLanguage(
    blocks: ContentBlock[]
  ): string | undefined {
    /*
     * Language detection is intentionally
     * conservative in V1.
     *
     * We currently only identify English
     * when the extracted text contains a
     * reasonable amount of English text.
     *
     * Later this can be replaced/enhanced
     * by a dedicated language detector or AI.
     */

    const text =
      blocks
        .map((block) =>
          "text" in block
            ? block.text
            : ""
        )
        .join(" ")
        .trim();

    if (!text) {
      return undefined;
    }

    const englishWords = [
      "the",
      "and",
      "is",
      "are",
      "with",
      "for",
      "from",
      "project",
      "experience",
      "education",
      "skills",
      "developer",
    ];

    const normalized =
      text.toLowerCase();

    const matches =
      englishWords.filter(
        (word) =>
          new RegExp(
            `\\b${word}\\b`,
            "i"
          ).test(normalized)
      ).length;

    if (matches >= 2) {
      return "en";
    }

    return undefined;
  }

  private collectSectionTitles(
    sections: IDocumentStructure["sections"]
  ): string[] {
    const titles: string[] = [];

    const visit = (
      currentSections: IDocumentStructure["sections"]
    ) => {
      for (const section of currentSections) {
        titles.push(section.title);

        if (
          section.children.length > 0
        ) {
          visit(section.children);
        }
      }
    };

    visit(sections);

    return titles;
  }
}

export const documentMetadataService =
  new DocumentMetadataService();