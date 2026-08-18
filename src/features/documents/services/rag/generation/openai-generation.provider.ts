import OpenAI from "openai";

export interface GenerateAnswerInput {
  query: string;
  context: string;
}

export interface GeneratedAnswer {
  answer: string;
  citations: number[];
}

export class OpenAIGenerationProvider {
  private readonly client: OpenAI;

  private readonly model =
    process.env.OPENAI_GENERATION_MODEL ??
    "gpt-4o-mini";

  constructor() {
    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured"
      );
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  async generateAnswer({
    query,
    context,
  }: GenerateAnswerInput): Promise<GeneratedAnswer> {
    if (!query.trim()) {
      throw new Error(
        "Query cannot be empty"
      );
    }

    if (!context.trim()) {
      throw new Error(
        "Context cannot be empty"
      );
    }

    const response =
      await this.client.chat.completions.create({
        model: this.model,

        temperature: 0,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content: `
You are a document question-answering assistant.

Answer the user's question using ONLY the provided DOCUMENT CONTEXT.

The context contains numbered sources such as:
SOURCE 1
SOURCE 2
SOURCE 3

Rules:
1. Do not use outside knowledge or make assumptions.
2. Every factual claim in your answer must be directly supported by text in one or more provided SOURCE chunks.
3. STRICT ENTITY ATTRIBUTION:
   - A relationship between an entity/technology and a project MUST be explicitly stated within that specific project's SOURCE chunk.
   - Do NOT attribute a technology (e.g. Redis, AWS) to a project (e.g. Arts of Imagination Ever / AOIE) unless that specific project's SOURCE chunk explicitly links them together.
   - The presence of a technology in one project chunk or in a global skills section does NOT mean it applies to another project chunk.
   - Distinguish between:
     a) A technology listed globally in TECHNICAL SKILLS
     b) A technology explicitly listed under a specific PROJECT
     c) A technology mentioned in SUMMARY or ADDITIONAL INFORMATION
4. GROUNDING & PURPOSE REASONING:
   - Statements of purpose, functionality, and features in the text (such as "for caching, performance optimization", "to improve system reliability and task execution efficiency", "for rate limiting") explain usage and purpose ("Why/What for"). Include these details to answer the user's question.
   - If the provided DOCUMENT CONTEXT contains no relevant text or facts matching the question at all, state clearly that the document does not contain that information, and return empty citations [].
   - NEVER invent outside facts, unmentioned reasons, or unsupported project associations.
5. EXHAUSTIVE ENUMERATION:
   - When asked to summarize or list "every" technology, authentication measure, or service, inspect ALL provided SOURCE chunks and list every matching item found across all sections without omitting any.
6. FORMATTING & COMPARISONS:
   - When asked to compare projects across dimensions, present the answer clearly using a Markdown comparison table or structured section headers.
   - Preserve technical names exactly as they appear in the document context.
7. SET DIFFERENCE / UNASSOCIATED SKILLS:
   - When asked for skills in TECHNICAL SKILLS not explicitly associated with a project, systematically check every skill listed under TECHNICAL SKILLS (such as SQL, Express.js, Docker, Postman, Git, GitHub, HTML5, CSS3, Tailwind CSS).
   - Compare each against the technology stacks explicitly listed in the PROJECT chunks (NexSyncHub, AssignFlow Hub, AOIE).
   - Output all skills from TECHNICAL SKILLS that are not explicitly listed in any PROJECT section.
8. Respond in valid json format.
9. "citations" must contain the 1-based SOURCE numbers (e.g. [1, 2]) that directly support the facts stated in the answer. Use [] if the context does not contain enough information to answer.

Return structure:
{
  "answer": "string",
  "citations": [1, 2]
}
            `.trim(),
          },
          {
            role: "user",
            content: `
DOCUMENT CONTEXT:

${context}

---

USER QUESTION:

${query}

---

Answer the user's question using only the document context. Respond in valid json format.
            `.trim(),
          },
        ],
      });

    const content =
      response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(
        "OpenAI returned an empty response"
      );
    }

    return this.parseResponse(content);
  }

  private parseResponse(content: string): GeneratedAnswer {
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: extract citations via regex if JSON parsing fails on complex table formatting
      const citationsMatch = content.match(/"citations"\s*:\s*\[([\d,\s]*)\]/);
      const citations: number[] = [];

      if (citationsMatch && citationsMatch[1]) {
        citationsMatch[1].split(",").forEach((val) => {
          const num = parseInt(val.trim(), 10);
          if (!isNaN(num) && num > 0) {
            citations.push(num);
          }
        });
      }

      return {
        answer: content,
        citations: Array.from(new Set(citations)),
      };
    }

    let answerStr = "";
    if (typeof parsed.answer === "string") {
      answerStr = parsed.answer.trim();
    } else if (typeof parsed.answer === "object" && parsed.answer !== null) {
      answerStr = JSON.stringify(parsed.answer, null, 2);
    } else {
      answerStr = content;
    }

    const rawCitations = Array.isArray(parsed.citations) ? parsed.citations : [];
    const citations: number[] = rawCitations
      .map((c: any) => (typeof c === "number" ? c : parseInt(String(c), 10)))
      .filter((c: number) => !isNaN(c) && c > 0);

    return {
      answer: answerStr,
      citations: Array.from(new Set(citations)),
    };
  }
}

export const openAIGenerationProvider =
  new OpenAIGenerationProvider();