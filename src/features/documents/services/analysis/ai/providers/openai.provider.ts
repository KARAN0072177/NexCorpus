import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type {
  DocumentAIInput,
  DocumentAIProvider,
} from "../document-ai.types";

import {
  documentAIResultSchema,
  type DocumentAIResult,
} from "../document-ai.schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DOCUMENT_AI_MODEL =
  process.env.OPENAI_DOCUMENT_MODEL ||
  "gpt-5.6-luna";

const DOCUMENT_AI_SYSTEM_PROMPT = `
You are the document understanding engine for NexCorpus.

Your task is to analyze already-extracted document blocks and enhance
their structural understanding.

IMPORTANT RULES:

1. The provided blocks are the canonical source of truth.
2. Never invent block IDs.
3. Every titleBlockId MUST refer to an existing block ID.
4. Every sourceBlockId MUST refer to an existing block ID.
5. Never rewrite or invent document content.
6. Do not create information that is not supported by the blocks.
7. Identify the most likely document title.
8. Identify the document type.
9. Identify the document language.
10. Build a meaningful semantic section hierarchy.
11. You may identify subsections that deterministic parsing could not
    reliably identify.
12. Preserve the original order of the document.
13. A block should belong to the most appropriate semantic section.
14. Do not duplicate source blocks across unrelated sections.
15. Prefer conservative decisions when the structure is ambiguous.

The output must strictly follow the provided structured schema.
`;

export class OpenAIProvider
  implements DocumentAIProvider
{
  async analyzeDocument(
    input: DocumentAIInput
  ): Promise<DocumentAIResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured"
      );
    }

    const response =
      await openai.responses.parse({
        model: DOCUMENT_AI_MODEL,

        instructions:
          DOCUMENT_AI_SYSTEM_PROMPT,

        input: [
          {
            role: "user",
            content: this.buildUserInput(
              input
            ),
          },
        ],

        reasoning: {
          effort: "low",
        },

        text: {
          verbosity: "low",

          format: zodTextFormat(
            documentAIResultSchema,
            "document_ai_analysis"
          ),
        },
      });

    if (!response.output_parsed) {
      throw new Error(
        "OpenAI returned no structured document analysis"
      );
    }

    /*
     * The Responses API parser already validates
     * the structured response against the Zod
     * schema.
     *
     * We parse once more here intentionally so
     * the provider boundary guarantees that the
     * returned value satisfies our application
     * contract regardless of future SDK changes.
     */

    return documentAIResultSchema.parse(
      response.output_parsed
    );
  }

  private buildUserInput(
    input: DocumentAIInput
  ): string {
    return [
      "Analyze the following extracted document blocks.",
      "",
      "BLOCKS:",
      JSON.stringify(
        input.blocks,
        null,
        2
      ),
    ].join("\n");
  }
}

export const openAIProvider =
  new OpenAIProvider();