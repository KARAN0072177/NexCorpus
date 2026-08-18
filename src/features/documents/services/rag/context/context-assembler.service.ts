import type { HybridSearchResult } from "../../retrieval/hybrid/mongodb-hybrid-search.service";

export interface AssembledContext {
  text: string;
  sourceCount: number;
  chunks: HybridSearchResult[];
  formattedContext: string;
}

const MAX_WORD_BUDGET = 2500; // ~3,000 max tokens

export class ContextAssemblerService {
  assemble(results: HybridSearchResult[]): AssembledContext {
    return this.assembleContext(results);
  }

  assembleContext(results: HybridSearchResult[]): AssembledContext {
    if (results.length === 0) {
      return {
        text: "",
        formattedContext: "",
        sourceCount: 0,
        chunks: [],
      };
    }

    const seenTexts = new Set<string>();
    const uniqueChunks: HybridSearchResult[] = [];
    let currentWordCount = 0;

    for (const chunk of results) {
      const normalizedText = chunk.text.trim().toLowerCase();

      // Deduplicate exact or near-identical text blocks
      if (seenTexts.has(normalizedText)) {
        continue;
      }

      seenTexts.add(normalizedText);

      const words = chunk.text.split(/\s+/).length;
      if (currentWordCount + words > MAX_WORD_BUDGET && uniqueChunks.length > 0) {
        // Enforce max token budget
        break;
      }

      uniqueChunks.push(chunk);
      currentWordCount += words;
    }

    const formattedSources = uniqueChunks.map((result, index) => {
      const section =
        result.sectionPath?.join(" > ") || "Unknown section";

      const pageRange =
        result.pageStart === result.pageEnd
          ? `Page ${result.pageStart}`
          : `Pages ${result.pageStart}-${result.pageEnd}`;

      return [
        `SOURCE ${index + 1}`,
        `Section: ${section}`,
        pageRange,
        "",
        result.text.trim(),
      ].join("\n");
    });

    const text = formattedSources.join("\n\n---\n\n");

    return {
      text,
      formattedContext: text,
      sourceCount: uniqueChunks.length,
      chunks: uniqueChunks,
    };
  }
}

export const contextAssemblerService = new ContextAssemblerService();