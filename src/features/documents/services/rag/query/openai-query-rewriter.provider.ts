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

const CONVERSATIONAL_REFERENCE_REGEX =
  /\b(it|this|that|there|they|them|these|those|the first one|the second one|that project|that technology|the previous project|the same one|same one)\b/i;

export class OpenAIQueryRewriterProvider {
  private readonly client: OpenAI;

  private readonly model =
    process.env.OPENAI_GENERATION_MODEL ?? "gpt-4o-mini";

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
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
      throw new Error("Query cannot be empty");
    }

    const trimmedQuery = query.trim();

    /*
     * --------------------------------------------------
     * Fast-Path Rewriter Bypass:
     * If conversation history is empty OR the query contains
     * no conversational references (pronouns/relative terms),
     * bypass OpenAI LLM call completely to save 500ms-1.2s + 500 tokens.
     * --------------------------------------------------
     */
    const hasReferences = CONVERSATIONAL_REFERENCE_REGEX.test(trimmedQuery);

    if (!conversation.length || !hasReferences) {
      const intent = this.classifyIntentLocally(trimmedQuery);
      let fastPathQuery = trimmedQuery;

      if (intent === "SET_DIFFERENCE") {
        fastPathQuery = "TECHNICAL SKILLS programming languages frameworks databases cloud tools";
      }

      return {
        query: fastPathQuery,
        rewritten: fastPathQuery !== trimmedQuery,
        intent,
      };
    }

    const conversationText = conversation
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

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
You are a conversation-aware query rewriter and intent classifier for a technical RAG system.

Your job:
1. Examine the current user query and recent conversation trajectory.
2. Resolve ambiguous pronouns or relative references (such as "it", "this", "that", "there", "they", "them", "the first one", "the second one", "that project", "the same one").
3. Rewrite the query into a standalone search query.
4. Classify the user query into one of 4 intent categories:
   - "TARGETED": Specific question about a single feature, project, or technology (e.g. "What did I use Redis for?").
   - "EXHAUSTIVE": Sweeping enumeration request across all categories/skills (e.g. "Summarize every authentication technology", "List every AWS service", "Give me all technologies in resume").
   - "COMPARISON": Explicit multi-entity comparative analysis (e.g. "Compare NexSyncHub versus AssignFlow Hub across database, auth, and real-time").
   - "SET_DIFFERENCE": Relational filtering for unassociated items (e.g. "What technologies in Technical Skills are not associated with any project?").

Rules:
- Preserve technical terms exactly.
- Respond ONLY in valid JSON format.

Return structure:
{
  "query": "standalone rewritten query string",
  "rewritten": true,
  "intent": "TARGETED" | "EXHAUSTIVE" | "COMPARISON" | "SET_DIFFERENCE"
}
          `.trim(),
        },
        {
          role: "user",
          content: `
CONVERSATION TRAJECTORY:
${conversationText}

CURRENT USER QUERY:
${trimmedQuery}
          `.trim(),
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return {
        query: trimmedQuery,
        rewritten: false,
        intent: this.classifyIntentLocally(trimmedQuery),
      };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        query: typeof parsed.query === "string" ? parsed.query.trim() : trimmedQuery,
        rewritten: Boolean(parsed.rewritten),
        intent: this.validateIntent(parsed.intent, trimmedQuery),
      };
    } catch {
      return {
        query: trimmedQuery,
        rewritten: false,
        intent: this.classifyIntentLocally(trimmedQuery),
      };
    }
  }

  private classifyIntentLocally(query: string): QueryIntent {
    const q = query.toLowerCase();

    if (
      q.includes("not associated") ||
      q.includes("not explicitly associated") ||
      q.includes("not in any project") ||
      q.includes("without a project") ||
      q.includes("not explicitly mentioned") ||
      q.includes("technical skills but not") ||
      q.includes("but not")
    ) {
      return "SET_DIFFERENCE";
    }

    if (
      q.includes("compare") ||
      q.includes("versus") ||
      q.includes(" vs ") ||
      q.includes("difference between")
    ) {
      return "COMPARISON";
    }

    if (
      q.includes("every") ||
      q.includes("all ") ||
      q.includes("summarize all") ||
      q.includes("inventory") ||
      q.includes("list all")
    ) {
      return "EXHAUSTIVE";
    }

    return "TARGETED";
  }

  private validateIntent(rawIntent: any, query: string): QueryIntent {
    const validIntents: QueryIntent[] = [
      "TARGETED",
      "EXHAUSTIVE",
      "COMPARISON",
      "SET_DIFFERENCE",
    ];

    if (typeof rawIntent === "string" && validIntents.includes(rawIntent as QueryIntent)) {
      return rawIntent as QueryIntent;
    }

    return this.classifyIntentLocally(query);
  }
}

export const openAIQueryRewriterProvider = new OpenAIQueryRewriterProvider();