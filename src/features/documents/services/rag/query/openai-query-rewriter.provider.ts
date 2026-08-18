import OpenAI from "openai";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RewriteQueryInput {
  query: string;
  conversation: ConversationMessage[];
}

export type QueryIntent =
  | "TARGETED"
  | "EXHAUSTIVE"
  | "COMPARISON"
  | "SET_DIFFERENCE";

export interface RewriteQueryResult {
  query: string;
  rewritten: boolean;
  intent: QueryIntent;
}

export class OpenAIQueryRewriterProvider {
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

  async rewriteQuery({
    query,
    conversation,
  }: RewriteQueryInput): Promise<RewriteQueryResult> {
    if (!query?.trim()) {
      throw new Error(
        "Query cannot be empty"
      );
    }

    const conversationText = conversation.length
      ? conversation
          .map(
            (message) =>
              `${message.role.toUpperCase()}: ${message.content}`
          )
          .join("\n")
      : "None";

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
You are a query rewriting and intent classification component for a conversational document retrieval (RAG) system.

Your job is to:
1. Rewrite the user's latest question into a fully self-contained, explicit standalone search query.
2. Classify the user query into one of 4 RAG retrieval intents.

Reference Resolution Rules:
- Examine both USER questions and ASSISTANT answers in CONVERSATION HISTORY to resolve all conversational references:
  * Pronouns ("it", "this", "that", "there", "they", "them") -> replace with explicit entity name (e.g. "Redis", "AWS S3", "NexSyncHub").
  * Ordinals and Positions ("the first one", "the second one", "the last project") -> map to the 1st, 2nd, or last mentioned item in conversation.
  * Demonstratives ("that project", "that technology", "there") -> map to specific entity/project/location.
- Preserve the user's original query intent.
- Do NOT answer the question.
- If the query is already 100% self-contained, keep it unchanged with "rewritten": false.

Intent Classification Rules:
- "EXHAUSTIVE": The query requests a document-wide sweep or exhaustive category enumeration (e.g. contains "every", "all", "entire resume", "without missing any", "every technology", "summarize every", "all AWS services").
- "COMPARISON": The query requests a comparison matrix across multiple projects/entities (e.g. "compare all three projects", "compare NexSyncHub versus AssignFlow").
- "SET_DIFFERENCE": The query requests items present in one section/set but not in another (e.g. "in Technical Skills but not explicitly associated with a project", "listed in skills but not in projects").
- "TARGETED": Default mode for normal specific questions, single-topic queries, or localized follow-ups (e.g. "What AWS services have I worked with?", "Why did I use Redis?", "What about NexSyncHub?").

Respond in valid json format using this exact structure:
{
  "query": "standalone search query",
  "rewritten": true,
  "intent": "TARGETED" | "EXHAUSTIVE" | "COMPARISON" | "SET_DIFFERENCE"
}
            `.trim(),
          },
          {
            role: "user",
            content: `
CONVERSATION HISTORY:

${conversationText}

---

CURRENT QUERY:

${query}

---

Rewrite the current query into a standalone retrieval query and classify its intent. Respond in json format.
Do not answer the query.
            `.trim(),
          },
        ],
      });

    const content =
      response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(
        "OpenAI returned an empty query rewrite response"
      );
    }

    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(
        "OpenAI returned invalid query rewrite JSON"
      );
    }

    if (
      typeof parsed.query !== "string" ||
      typeof parsed.rewritten !== "boolean"
    ) {
      throw new Error(
        "OpenAI returned an invalid query rewrite structure"
      );
    }

    const rewrittenQuery =
      parsed.query.trim();

    if (!rewrittenQuery) {
      throw new Error(
        "OpenAI returned an empty rewritten query"
      );
    }

    const validIntents: QueryIntent[] = [
      "TARGETED",
      "EXHAUSTIVE",
      "COMPARISON",
      "SET_DIFFERENCE",
    ];

    const intent: QueryIntent = validIntents.includes(
      parsed.intent
    )
      ? parsed.intent
      : "TARGETED";

    return {
      query: rewrittenQuery,
      rewritten: parsed.rewritten,
      intent,
    };
  }
}

export const openAIQueryRewriterProvider =
  new OpenAIQueryRewriterProvider();