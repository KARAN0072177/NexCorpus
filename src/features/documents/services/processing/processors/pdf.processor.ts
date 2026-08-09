import type {
  ContentBlock,
} from "../../../models/processed-document.model";

import type {
  DocumentProcessor,
  ProcessedContent,
  ProcessorSource,
} from "../processor.types";

import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";

import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

/*
 * PDF.js worker configuration for the Next.js server.
 */

const pdfWorkerPath = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.mjs"
);

GlobalWorkerOptions.workerSrc =
  pathToFileURL(pdfWorkerPath).href;

interface ExtractedLine {
  text: string;
  page: number;

  fontSize: number;

  x: number;
  y: number;

  width: number;
  height: number;

  fontName?: string;

  hasMultipleFragments: boolean;
}

export class PdfProcessor
  implements DocumentProcessor
{
  supports(
    source: ProcessorSource
  ): boolean {
    return (
      source.extension.toLowerCase() === ".pdf" ||
      source.mimeType.toLowerCase() ===
        "application/pdf"
    );
  }

  async process(
    file: Buffer,
    source: ProcessorSource
  ): Promise<ProcessedContent> {
    const data = new Uint8Array(file);

    const pdf = await getDocument({
      data,
      useSystemFonts: true,
    }).promise;

    const blocks: ContentBlock[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber++
    ) {
      const page =
        await pdf.getPage(pageNumber);

      const textContent =
        await page.getTextContent();

      const lines =
        this.extractLines(
          textContent.items,
          pageNumber
        );

      const pageBlocks =
        this.createBlocks(lines);

      blocks.push(...pageBlocks);
    }

    return {
      source: {
        filename: source.filename,
        mimeType: source.mimeType,
      },

      metadata: {
        pageCount: pdf.numPages,
      },

      blocks,
    };
  }

  private extractLines(
    items: unknown[],
    page: number
  ): ExtractedLine[] {
    const lines: ExtractedLine[] = [];

    let currentText = "";
    let currentY: number | null = null;

    let currentFontSize = 0;
    let currentX = 0;

    let currentWidth = 0;
    let currentHeight = 0;

    let currentFontName:
      | string
      | undefined;

    let fragmentCount = 0;

    for (const item of items) {
      if (!this.isTextItem(item)) {
        continue;
      }

      const text = item.str.trim();

      if (!text) {
        continue;
      }

      const transform = item.transform;

      const x = transform[4];
      const y = transform[5];

      const fontSize =
        Math.abs(transform[0]) || 12;

      const width =
        typeof item.width === "number"
          ? item.width
          : 0;

      const height =
        typeof item.height === "number"
          ? item.height
          : fontSize;

      const fontName =
        typeof item.fontName === "string"
          ? item.fontName
          : undefined;

      /*
       * PDF.js returns text as fragments rather
       * than guaranteed semantic lines.
       *
       * Fragments on approximately the same
       * Y position are grouped into one line.
       */

      const isNewLine =
        currentY !== null &&
        Math.abs(currentY - y) > 3;

      if (isNewLine) {
        this.pushLine(lines, {
          text: currentText,
          page,
          fontSize: currentFontSize,
          x: currentX,
          y: currentY!,
          width: currentWidth,
          height: currentHeight,
          fontName: currentFontName,
          hasMultipleFragments:
            fragmentCount > 1,
        });

        currentText = "";
        currentFontSize = 0;
        currentX = 0;
        currentWidth = 0;
        currentHeight = 0;
        currentFontName = undefined;
        fragmentCount = 0;
      }

      if (
        currentY === null ||
        Math.abs(currentY - y) > 3
      ) {
        currentY = y;
      }

      if (fragmentCount === 0) {
        currentX = x;
      }

      if (currentText) {
        currentText += " ";
      }

      currentText += text;

      currentFontSize = Math.max(
        currentFontSize,
        fontSize
      );

      currentWidth += width;

      currentHeight = Math.max(
        currentHeight,
        height
      );

      if (!currentFontName) {
        currentFontName = fontName;
      }

      fragmentCount++;
    }

    this.pushLine(lines, {
      text: currentText,
      page,
      fontSize: currentFontSize,
      x: currentX,
      y: currentY ?? 0,
      width: currentWidth,
      height: currentHeight,
      fontName: currentFontName,
      hasMultipleFragments:
        fragmentCount > 1,
    });

    return lines;
  }

  private pushLine(
    lines: ExtractedLine[],
    line: ExtractedLine
  ) {
    const normalizedText =
      line.text
        .replace(/\s+/g, " ")
        .trim();

    if (!normalizedText) {
      return;
    }

    lines.push({
      ...line,
      text: normalizedText,
    });
  }

  private createBlocks(
    lines: ExtractedLine[]
  ): ContentBlock[] {
    if (lines.length === 0) {
      return [];
    }

    const averageFontSize =
      lines.reduce(
        (total, line) =>
          total + line.fontSize,
        0
      ) / lines.length;

    return lines.map(
      (line, index) => {
        const previousLine =
          lines[index - 1];

        const nextLine =
          lines[index + 1];

        const classification =
          this.classifyLine({
            line,
            previousLine,
            nextLine,
            averageFontSize,
          });

        /*
         * Every canonical block receives its own
         * stable application-level ID.
         *
         * This ID will later be referenced by
         * DocumentStructure, chunks, citations,
         * and other derived artifacts.
         */

        if (
          classification.type ===
          "heading"
        ) {
          return {
            id: randomUUID(),

            type: "heading",

            level:
              classification.level,

            text: line.text,

            page: line.page,
          };
        }

        return {
          id: randomUUID(),

          type: "paragraph",

          text: line.text,

          page: line.page,
        };
      }
    );
  }

  private classifyLine({
    line,
    previousLine,
    nextLine,
    averageFontSize,
  }: {
    line: ExtractedLine;
    previousLine?: ExtractedLine;
    nextLine?: ExtractedLine;
    averageFontSize: number;
  }):
    | {
        type: "heading";
        level: number;
      }
    | {
        type: "paragraph";
      } {
    /*
     * A line that is extremely long is very
     * unlikely to be a heading.
     */

    if (line.text.length > 120) {
      return {
        type: "paragraph",
      };
    }

    /*
     * Explicitly recognize common
     * section-heading patterns.
     *
     * This is a structural heuristic,
     * not an LLM.
     */

    if (
      this.looksLikeSectionHeading(
        line.text
      )
    ) {
      return {
        type: "heading",

        level:
          this.getHeadingLevel(
            line,
            averageFontSize
          ),
      };
    }

    /*
     * Larger text than the document average
     * is another structural signal.
     */

    const fontRatio =
      line.fontSize /
      averageFontSize;

    if (fontRatio >= 1.35) {
      return {
        type: "heading",

        level:
          this.getHeadingLevel(
            line,
            averageFontSize
          ),
      };
    }

    /*
     * A short standalone line surrounded by
     * longer paragraphs can also indicate
     * a heading.
     */

    const shortLine =
      line.text.length <= 80;

    const surroundedByText =
      previousLine &&
      nextLine &&
      previousLine.text.length >
        line.text.length &&
      nextLine.text.length >
        line.text.length;

    if (
      shortLine &&
      surroundedByText &&
      fontRatio >= 1.15
    ) {
      return {
        type: "heading",
        level: 3,
      };
    }

    return {
      type: "paragraph",
    };
  }

  private looksLikeSectionHeading(
    text: string
  ): boolean {
    const normalized =
      text
        .trim()
        .replace(/[:\-–—]+$/, "");

    if (!normalized) {
      return false;
    }

    /*
     * Short all-uppercase lines are a strong
     * signal for section headings in resumes
     * and business documents.
     */

    const isShort =
      normalized.length <= 60;

    const isUppercase =
      normalized ===
      normalized.toUpperCase();

    const containsLetters =
      /[A-Z]/.test(normalized);

    const hasSentencePunctuation =
      /[.!?]/.test(normalized);

    return (
      isShort &&
      isUppercase &&
      containsLetters &&
      !hasSentencePunctuation
    );
  }

  private getHeadingLevel(
    line: ExtractedLine,
    averageFontSize: number
  ): number {
    const ratio =
      line.fontSize /
      averageFontSize;

    if (ratio >= 1.7) {
      return 1;
    }

    if (ratio >= 1.45) {
      return 2;
    }

    return 3;
  }

  private isTextItem(
    item: unknown
  ): item is {
    str: string;
    transform: number[];
    width?: number;
    height?: number;
    fontName?: string;
  } {
    if (
      typeof item !== "object" ||
      item === null
    ) {
      return false;
    }

    const value =
      item as Record<string, unknown>;

    return (
      typeof value.str === "string" &&
      Array.isArray(
        value.transform
      ) &&
      value.transform.length >= 6 &&
      value.transform.every(
        (value) =>
          typeof value === "number"
      )
    );
  }
}