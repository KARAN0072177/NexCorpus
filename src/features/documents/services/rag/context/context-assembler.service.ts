import type {
  HybridSearchResult,
} from "../../retrieval/hybrid/mongodb-hybrid-search.service";

export interface AssembledContext {
  text: string;
  sourceCount: number;
}

export class ContextAssemblerService {
  assemble(
    results: HybridSearchResult[]
  ): AssembledContext {
    if (results.length === 0) {
      return {
        text: "",
        sourceCount: 0,
      };
    }

    const sources = results.map(
      (result, index) => {
        const section =
          result.sectionPath?.join(" > ") ||
          "Unknown section";

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
      }
    );

    return {
      text: sources.join("\n\n---\n\n"),
      sourceCount: results.length,
    };
  }
}

export const contextAssemblerService =
  new ContextAssemblerService();