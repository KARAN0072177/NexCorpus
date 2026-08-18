import { connectToDatabase } from "../src/lib/db/mongodb";
import { ragService, type ConversationMessage } from "../src/features/documents/services/rag/rag.service";
import { openAIQueryRewriterProvider } from "../src/features/documents/services/rag/query/openai-query-rewriter.provider";

const DOCUMENT_ID = "6a788892aba263e5f921bdcb";

interface TestCase {
  title: string;
  conversation: ConversationMessage[];
  followUpQuery: string;
}

const TEST_CASES: TestCase[] = [
  {
    title: "Test 1: Pronoun resolution ('it') & Why reason check",
    conversation: [
      { role: "user", content: "What did I use Redis for?" },
      {
        role: "assistant",
        content:
          "Redis was used for caching, performance optimization, and abuse prevention in NexSyncHub, as well as distributed background job processing in AssignFlow Hub.",
      },
    ],
    followUpQuery: "Why did I use it?",
  },
  {
    title: "Test 2: Pronoun resolution ('it') & Strict Entity Attribution (AOIE non-attribution)",
    conversation: [
      { role: "user", content: "What did I use Redis for?" },
      {
        role: "assistant",
        content:
          "Redis was used for caching, performance optimization, and abuse prevention in NexSyncHub, as well as distributed background job processing in AssignFlow Hub.",
      },
    ],
    followUpQuery: "Which project used it?",
  },
  {
    title: "Test 3: Project reference resolution ('What about NexSyncHub?')",
    conversation: [
      { role: "user", content: "What projects have I built?" },
      {
        role: "assistant",
        content:
          "You have built Arts of Imagination Ever (AOIE), NexSyncHub, and AssignFlow Hub.",
      },
    ],
    followUpQuery: "What about NexSyncHub?",
  },
  {
    title: "Test 4: Ordinal reference resolution ('the first one')",
    conversation: [
      { role: "user", content: "What projects have I built?" },
      {
        role: "assistant",
        content:
          "You have built Arts of Imagination Ever (AOIE), NexSyncHub, and AssignFlow Hub.",
      },
    ],
    followUpQuery: "What about the first one?",
  },
  {
    title: "Test 5: Location reference resolution ('there')",
    conversation: [
      { role: "user", content: "Tell me about NexSyncHub." },
      {
        role: "assistant",
        content:
          "NexSyncHub is a real-time collaborative SaaS platform featuring workspace architecture and media moderation.",
      },
    ],
    followUpQuery: "What did I use there?",
  },
  {
    title: "Test 6: Plural pronoun reference resolution ('them')",
    conversation: [
      { role: "user", content: "What AWS services have I worked with?" },
      {
        role: "assistant",
        content: "You have worked with AWS S3 and AWS Rekognition.",
      },
    ],
    followUpQuery: "Where did I use them?",
  },
  {
    title: "Test 7: Negative case (Information NOT in document)",
    conversation: [
      { role: "user", content: "What database did I use in NexSyncHub?" },
      {
        role: "assistant",
        content: "NexSyncHub used MongoDB and Upstash Redis.",
      },
    ],
    followUpQuery: "What GraphQL client library was configured there?",
  },
];

async function runConversationalRAGTestSuite() {
  await connectToDatabase();

  console.log("==========================================================");
  console.log("  CONVERSATIONAL RAG REFERENCE RESOLUTION & GROUNDING TEST");
  console.log("==========================================================\n");

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n--- ${testCase.title} ---`);
    console.log(`FOLLOW-UP QUERY: "${testCase.followUpQuery}"`);

    // 1. Check Query Rewriter
    const rewriteRes = await openAIQueryRewriterProvider.rewriteQuery({
      query: testCase.followUpQuery,
      conversation: testCase.conversation,
    });
    console.log(`REWRITTEN QUERY : "${rewriteRes.query}" (Rewritten: ${rewriteRes.rewritten})`);

    // 2. Check RAG Pipeline Output
    const ragRes = await ragService.askDocument({
      documentId: DOCUMENT_ID,
      query: testCase.followUpQuery,
      conversation: testCase.conversation,
    });

    console.log(`ANSWER:\n${ragRes.answer}`);
    console.log(`CITATIONS (${ragRes.sources.length}):`);
    ragRes.sources.forEach((source, sIdx) => {
      console.log(`  [Source ${sIdx + 1}] ${source.sectionPath.join(" > ")} (Page ${source.pageStart})`);
    });
  }

  console.log("\n==========================================================");
  console.log("  TEST SUITE COMPLETE");
  console.log("==========================================================");

  process.exit(0);
}

runConversationalRAGTestSuite().catch(console.error);
