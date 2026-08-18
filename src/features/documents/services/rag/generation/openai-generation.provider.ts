import OpenAI from "openai";

export interface GenerateAnswerInput {
  query: string;
  context: string;
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
  }: GenerateAnswerInput): Promise<string> {
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

        messages: [
          {
            role: "system",
            content: `
You are a document question-answering assistant.

Answer the user's question using ONLY the provided document context.

Rules:
- Do not use outside knowledge.
- Do not invent or assume information.
- If the context does not contain enough information to answer the question, say that the information is not available in the provided document.
- Give a concise and direct answer.
- When useful, mention the relevant project or section from the context.
- Preserve technical names exactly as they appear in the document.
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

Answer the user's question using only the document context.
            `.trim(),
          },
        ],
      });

    const answer =
      response.choices[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error(
        "OpenAI returned an empty answer"
      );
    }

    return answer;
  }
}

export const openAIGenerationProvider =
  new OpenAIGenerationProvider();