import OpenAI from "openai";

export interface GenerationProviderInput {
  query: string;
  context: string;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface GeneratedAnswer {
  answer: string;
  citations: number[];
}

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export class OpenAIGenerationProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  }

  async generateAnswer(
    input: GenerationProviderInput
  ): Promise<GeneratedAnswer> {
    const { query, context } = input;

    const response = await this.client.chat.completions.create({
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
   - Do NOT attribute a technology (e.g. Redis, AWS) to a project unless that specific project's SOURCE chunk explicitly links them together.
4. GROUNDING & PURPOSE REASONING:
   - Statements of purpose, functionality, and features in the text explain usage and purpose ("Why/What for"). Include these details to answer the user's question.
   - If the provided DOCUMENT CONTEXT contains no relevant text or facts matching the question at all, state clearly that the document does not contain that information, and return empty citations [].
5. EXHAUSTIVE ENUMERATION & HUMAN-READABLE FORMATTING:
   - Present answers in clean, beautiful, human-readable Markdown (using bullet points, bold headers, or Markdown tables).
   - NEVER output a raw JSON structure or JSON code inside the "answer" field.
6. FORMATTING & COMPARISONS:
   - When asked to compare projects across dimensions, present the answer clearly using a Markdown comparison table or structured section headers.
   - Preserve technical names exactly as they appear in the document context.
7. Respond in valid JSON format containing "answer" and "citations".
8. "citations" must contain the 1-based SOURCE numbers (e.g. [1, 2]) that directly support the facts stated in the answer. Use [] if the context does not contain enough information to answer.

Return structure:
{
  "answer": "string (formatted in human-readable Markdown)",
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

Answer the user's question using only the document context. Format the answer as clean Markdown text. Respond in valid json format.
          `.trim(),
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    return this.parseResponse(content);
  }

  async *generateAnswerStream(
    input: GenerationProviderInput
  ): AsyncIterable<string> {
    const { query, context } = input;

    const stream = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      stream: true,
      messages: [
        {
          role: "system",
          content: `
You are a friendly document question-answering assistant.

Answer the user's question using ONLY the provided DOCUMENT CONTEXT.

The context contains numbered sources such as:
SOURCE 1
SOURCE 2
SOURCE 3

Rules:
1. Every factual claim in your answer must be directly supported by text in one or more provided SOURCE chunks.
2. Present answers in clean, beautiful, human-readable Markdown (using bullet points, bold headers, or Markdown tables).
3. If the provided DOCUMENT CONTEXT contains no relevant text or facts matching the question at all, state clearly that the document does not contain that information.
4. Output Markdown text directly (do NOT wrap in JSON format when streaming).
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

Answer the user's question using only the document context. Format the answer in clean human-readable Markdown.
          `.trim(),
        },
      ],
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        yield token;
      }
    }
  }

  private parseResponse(content: string): GeneratedAnswer {
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
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
      answerStr = this.convertJsonObjectToMarkdown(parsed.answer);
    } else {
      answerStr = content;
    }

    if (answerStr.startsWith("{") && answerStr.endsWith("}")) {
      try {
        const obj = JSON.parse(answerStr);
        if (typeof obj === "object" && obj !== null && !obj.answer) {
          answerStr = this.convertJsonObjectToMarkdown(obj);
        }
      } catch {
        // keep as is
      }
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

  private convertJsonObjectToMarkdown(obj: Record<string, any>): string {
    let md = "";

    for (const [key, value] of Object.entries(obj)) {
      md += `### **${key}**\n`;

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            const projectStr = item.project ? `**[${item.project}]** ` : "";
            const desc = item.description || item.usage || JSON.stringify(item);
            md += `- ${projectStr}${desc}\n`;
          } else {
            md += `- ${item}\n`;
          }
        }
      } else if (typeof value === "object" && value !== null) {
        if (value.usage && Array.isArray(value.usage)) {
          for (const u of value.usage) {
            const projectStr = u.project ? `**[${u.project}]** ` : "";
            const desc = u.description || u.usage || JSON.stringify(u);
            md += `- ${projectStr}${desc}\n`;
          }
        } else {
          for (const [subKey, subVal] of Object.entries(value)) {
            if (subKey === "service") continue;
            md += `  - **${subKey}**: ${
              typeof subVal === "object" ? JSON.stringify(subVal) : subVal
            }\n`;
          }
        }
      } else {
        md += `${value}\n`;
      }

      md += "\n";
    }

    return md.trim();
  }
}

export const openAIGenerationProvider = new OpenAIGenerationProvider();