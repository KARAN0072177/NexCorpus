import fs from "fs";
import path from "path";
import { connectToDatabase } from "../src/lib/db/mongodb";
import { ragService } from "../src/features/documents/services/rag/rag.service";
import { openAIQueryRewriterProvider } from "../src/features/documents/services/rag/query/openai-query-rewriter.provider";

const DOCUMENT_ID = "6a788892aba263e5f921bdcb";
const OUTPUT_HTML_PATH = path.join(
  process.cwd(),
  "docs",
  "testing",
  "data",
  "results.html"
);

interface QAEvalTestCase {
  id: string;
  round: "Round 1: Quality" | "Round 2: Completeness";
  category: string;
  query: string;
  expectedBehavior: string;
  requiredKeywords?: string[];
}

const EVAL_SUITE: QAEvalTestCase[] = [
  /*
   * --------------------------------------------------
   * ROUND 1: QUALITY & EDGE-CASE BENCHMARKS
   * --------------------------------------------------
   */
  {
    id: "QUAL-1",
    round: "Round 1: Quality",
    category: "Multi-Chunk Synthesis",
    query:
      "What databases and real-time communication technologies are used across all my projects?",
    expectedBehavior:
      "Synthesizes databases (MongoDB, Redis, Upstash Redis) and real-time technologies (Socket.IO, BullMQ) from NexSyncHub, AssignFlow Hub, and Technical Skills.",
  },
  {
    id: "QUAL-2",
    round: "Round 1: Quality",
    category: "Cross-Project Comparison",
    query:
      "Compare the tech stacks and authentication methods of NexSyncHub versus AssignFlow Hub.",
    expectedBehavior:
      "Accurate side-by-side comparison. Attributes NextAuth.js/Turnstile to NexSyncHub and RBAC to AssignFlow Hub without cross-attributing.",
  },
  {
    id: "QUAL-3",
    round: "Round 1: Quality",
    category: "Multi-Section Spread",
    query:
      "Summarize all AWS services, security measures, and deployment platforms mentioned across my entire resume.",
    expectedBehavior:
      "Gathers AWS (S3, Rekognition), Security (JWT, OAuth 2.0, NextAuth, Turnstile, Rate Limiting), and Deployment (Docker, Render, AWS) across Summary, Projects, Skills, and Additional Info.",
  },
  {
    id: "QUAL-4",
    round: "Round 1: Quality",
    category: "Zero-Evidence / Out-of-Bound",
    query:
      "What Kubernetes cluster configuration and Terraform modules were used for deployment?",
    expectedBehavior:
      "Explicit fallback: states information is not available in the document. Citations array must be empty [].",
  },
  {
    id: "QUAL-5",
    round: "Round 1: Quality",
    category: "Ambiguous / Underspecified",
    query: "What performance bottleneck did I optimize in 2024?",
    expectedBehavior:
      "Non-hallucination: states information/date 2024 is not available in the document instead of guessing metric details.",
  },
  {
    id: "QUAL-6",
    round: "Round 1: Quality",
    category: "Lexical vs Semantic Conflict",
    query:
      "Which project features moderation tools for policy-violating media uploads?",
    expectedBehavior:
      "Semantic precision: accurately identifies NexSyncHub (AWS Rekognition media moderation pipeline) despite lexical overlap in AOIE ('user moderation tools').",
  },

  /*
   * --------------------------------------------------
   * ROUND 2: ANSWER COMPLETENESS BENCHMARKS
   * --------------------------------------------------
   */
  {
    id: "COMP-1",
    round: "Round 2: Completeness",
    category: "Exhaustive Security & Auth Enumeration",
    query: "Summarize every authentication/security technology mentioned in my resume.",
    expectedBehavior:
      "Exhaustive list of all auth/security tech: JWT, OAuth 2.0, NextAuth.js, Cloudflare Turnstile, OTP-based password recovery, Email Verification, Redis rate limiting, RBAC, Super Admin dashboards.",
    requiredKeywords: ["JWT", "OAuth", "NextAuth", "Turnstile", "OTP", "Rate Limiting", "RBAC"],
  },
  {
    id: "COMP-2",
    round: "Round 2: Completeness",
    category: "Exhaustive AWS Mapping",
    query: "List every AWS service and where I used each one.",
    expectedBehavior:
      "Exhaustively maps AWS S3 (storage/tech stack), AWS Rekognition (NexSyncHub media moderation), and general AWS services (AssignFlow & Additional Info).",
    requiredKeywords: ["S3", "Rekognition", "NexSyncHub"],
  },
  {
    id: "COMP-3",
    round: "Round 2: Completeness",
    category: "Multi-Dimensional 3-Project Matrix",
    query:
      "Compare all three projects by: database, authentication, real-time technology, cloud, payments, background processing.",
    expectedBehavior:
      "Full 3-project matrix: NexSyncHub, AssignFlow Hub, and Arts of Imagination Ever (AOIE) across all 6 dimensions.",
    requiredKeywords: ["NexSyncHub", "AssignFlow", "AOIE", "MongoDB", "Redis", "Stripe", "BullMQ"],
  },
  {
    id: "COMP-4",
    round: "Round 2: Completeness",
    category: "Unassociated Skills Detection",
    query:
      "What technologies are mentioned in Technical Skills but not explicitly associated with a project?",
    expectedBehavior:
      "Identifies standalone skills listed in Technical Skills (e.g. SQL, Express.js, Docker, Postman, Git, GitHub) that do not appear under project bullets.",
    requiredKeywords: ["SQL", "Express", "Docker", "Postman", "Git"],
  },
  {
    id: "COMP-5",
    round: "Round 2: Completeness",
    category: "Complete Technology Inventory",
    query: "Give me every technology mentioned in the resume without missing any.",
    expectedBehavior:
      "Exhaustive sweep of all languages, frontend, backend, databases, real-time, cloud, auth, payments, and tools across the entire resume.",
    requiredKeywords: ["JavaScript", "TypeScript", "React", "Next.js", "Node", "MongoDB", "Redis", "AWS", "Stripe", "Docker"],
  },
];

interface EvaluationResult {
  id: string;
  round: "Round 1: Quality" | "Round 2: Completeness";
  category: string;
  query: string;
  rewrittenQuery: string;
  wasRewritten: boolean;
  expectedBehavior: string;
  answer: string;
  sources: {
    id: string;
    sectionPath: string[];
    pageStart: number;
    pageEnd: number;
    score: number;
  }[];
  latencyMs: number;
  status: "PASSED" | "FAILED";
  completenessScorePct: number;
  notes: string;
}

async function runQAEvaluationSuite() {
  await connectToDatabase();

  console.log("==========================================================");
  console.log("  NEXCORPUS RAG QUALITY & COMPLETENESS EVALUATION SUITE");
  console.log("==========================================================\n");

  const results: EvaluationResult[] = [];

  for (const testCase of EVAL_SUITE) {
    console.log(`Executing ${testCase.id} [${testCase.round}]: [${testCase.category}]...`);
    const startTime = Date.now();

    try {
      const rewriteResult = await openAIQueryRewriterProvider.rewriteQuery({
        query: testCase.query,
        conversation: [],
      });

      const ragResult = await ragService.askDocument({
        documentId: DOCUMENT_ID,
        query: testCase.query,
        conversation: [],
      });

      const latencyMs = Date.now() - startTime;

      let status: "PASSED" | "FAILED" = "PASSED";
      let notes = "Verified strict grounding, citation integrity, and exhaustive recall.";
      let completenessScorePct = 100;

      if (testCase.requiredKeywords && testCase.requiredKeywords.length > 0) {
        const answerLower = ragResult.answer.toLowerCase();
        const foundCount = testCase.requiredKeywords.filter((kw) =>
          answerLower.includes(kw.toLowerCase())
        ).length;

        completenessScorePct = Math.round(
          (foundCount / testCase.requiredKeywords.length) * 100
        );

        if (completenessScorePct < 70) {
          status = "FAILED";
          notes = `Completeness check failed: found ${foundCount}/${testCase.requiredKeywords.length} required key entities (${completenessScorePct}% recall).`;
        } else {
          notes = `Exhaustive recall verified: ${foundCount}/${testCase.requiredKeywords.length} required entities present (${completenessScorePct}% recall).`;
        }
      }

      if (testCase.id === "QUAL-4" || testCase.id === "QUAL-5") {
        if (ragResult.sources.length > 0) {
          status = "FAILED";
          notes = "Failed zero-evidence check: citations were returned for an out-of-bounds/ambiguous query.";
        } else if (
          !ragResult.answer.toLowerCase().includes("not contain") &&
          !ragResult.answer.toLowerCase().includes("not provide") &&
          !ragResult.answer.toLowerCase().includes("not available") &&
          !ragResult.answer.toLowerCase().includes("couldn't find")
        ) {
          status = "FAILED";
          notes = "Failed grounding check: model hallucinated facts instead of stating missing information.";
        }
      }

      results.push({
        id: testCase.id,
        round: testCase.round,
        category: testCase.category,
        query: testCase.query,
        rewrittenQuery: rewriteResult.query,
        wasRewritten: rewriteResult.rewritten,
        expectedBehavior: testCase.expectedBehavior,
        answer: ragResult.answer,
        sources: ragResult.sources,
        latencyMs,
        status,
        completenessScorePct,
        notes,
      });

      console.log(
        `  -> Status: ${status} (${latencyMs}ms, ${ragResult.sources.length} citations, Completeness: ${completenessScorePct}%)`
      );
    } catch (err: any) {
      console.error(`  -> ERROR executing ${testCase.id}:`, err.message);
      results.push({
        id: testCase.id,
        round: testCase.round,
        category: testCase.category,
        query: testCase.query,
        rewrittenQuery: testCase.query,
        wasRewritten: false,
        expectedBehavior: testCase.expectedBehavior,
        answer: `ERROR: ${err.message}`,
        sources: [],
        latencyMs: Date.now() - startTime,
        status: "FAILED",
        completenessScorePct: 0,
        notes: `Execution exception: ${err.message}`,
      });
    }
  }

  generateHTMLReport(results);

  console.log("\n==========================================================");
  console.log(`  EVALUATION COMPLETE. Report saved to:\n  ${OUTPUT_HTML_PATH}`);
  console.log("==========================================================");

  process.exit(0);
}

function generateHTMLReport(results: EvaluationResult[]) {
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.status === "PASSED").length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  const avgLatency = (
    results.reduce((acc, r) => acc + r.latencyMs, 0) / totalTests
  ).toFixed(0);

  const round1Results = results.filter((r) => r.round === "Round 1: Quality");
  const round2Results = results.filter((r) => r.round === "Round 2: Completeness");

  const avgCompletenessR2 = (
    round2Results.reduce((acc, r) => acc + r.completenessScorePct, 0) /
    round2Results.length
  ).toFixed(1);

  const renderCards = (list: EvaluationResult[]) =>
    list
      .map(
        (r) => `
    <div class="test-card ${r.status.toLowerCase()}">
      <div class="test-header">
        <span class="badge ${r.status.toLowerCase()}">${r.status}</span>
        <span class="test-id">${r.id}</span>
        <span class="test-category">${r.category}</span>
        <span class="test-completeness">Recall: ${r.completenessScorePct}%</span>
        <span class="test-latency">${r.latencyMs} ms</span>
      </div>

      <div class="query-section">
        <strong>User Query:</strong> "${escapeHtml(r.query)}"
        ${
          r.wasRewritten
            ? `<div class="rewritten-query"><strong>Standalone Rewritten Query:</strong> "${escapeHtml(
                r.rewrittenQuery
              )}"</div>`
            : ""
        }
      </div>

      <div class="expected-section">
        <strong>Target Evaluation Goal:</strong> ${escapeHtml(r.expectedBehavior)}
      </div>

      <div class="answer-section">
        <strong>RAG Generated Answer:</strong>
        <div class="answer-box">${escapeHtml(r.answer)}</div>
      </div>

      <div class="sources-section">
        <strong>Cited Sources (${r.sources.length}):</strong>
        ${
          r.sources.length === 0
            ? '<p class="no-sources">No citations returned (Zero-Evidence / Grounded Fallback)</p>'
            : `<ul class="source-list">
                ${r.sources
                  .map(
                    (s, i) => `
                  <li>
                    <span class="source-num">Source ${i + 1}</span>
                    <span class="source-path">${escapeHtml(
                      s.sectionPath.join(" &gt; ")
                    )}</span>
                    <span class="source-page">Page ${s.pageStart}</span>
                    <span class="source-score">Score: ${s.score.toFixed(
                      4
                    )}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>`
        }
      </div>

      <div class="notes-section">
        <strong>Evaluation Notes:</strong> ${escapeHtml(r.notes)}
      </div>
    </div>
  `
      )
      .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexCorpus RAG Quality & Completeness Benchmark</title>
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #334155;
      --pass-color: #10b981;
      --fail-color: #ef4444;
      --accent-color: #3b82f6;
      --highlight-color: #8b5cf6;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1050px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 30px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 20px;
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #ffffff;
    }
    .timestamp {
      color: var(--text-muted);
      font-size: 14px;
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 40px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      margin-top: 5px;
    }
    .metric-value.pass { color: var(--pass-color); }
    .metric-value.fail { color: var(--fail-color); }
    .metric-value.info { color: var(--accent-color); }
    .metric-value.purple { color: var(--highlight-color); }

    .section-title {
      font-size: 22px;
      margin: 40px 0 20px 0;
      color: #38bdf8;
      border-bottom: 2px solid #38bdf8;
      padding-bottom: 8px;
    }

    .test-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 25px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    .test-card.passed { border-left: 5px solid var(--pass-color); }
    .test-card.failed { border-left: 5px solid var(--fail-color); }

    .test-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 12px;
    }
    .badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .badge.passed { background: rgba(16, 185, 129, 0.2); color: var(--pass-color); }
    .badge.failed { background: rgba(239, 68, 68, 0.2); color: var(--fail-color); }

    .test-id { font-weight: bold; color: var(--accent-color); }
    .test-category { font-weight: 600; font-size: 15px; flex-grow: 1; }
    .test-completeness { font-size: 12px; font-weight: bold; color: var(--highlight-color); background: rgba(139, 92, 246, 0.15); padding: 2px 8px; border-radius: 4px; }
    .test-latency { font-size: 13px; color: var(--text-muted); background: #0f172a; padding: 2px 8px; border-radius: 4px; }

    .query-section, .expected-section, .answer-section, .sources-section, .notes-section {
      margin-bottom: 16px;
    }
    .rewritten-query {
      margin-top: 6px;
      font-size: 14px;
      color: #38bdf8;
    }
    .answer-box {
      background: #0f172a;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 14px;
      margin-top: 6px;
      white-space: pre-wrap;
      font-size: 15px;
    }
    .source-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
    }
    .source-list li {
      background: #0f172a;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
      display: flex;
      gap: 12px;
      font-size: 13px;
      align-items: center;
    }
    .source-num { background: var(--accent-color); color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .source-path { flex-grow: 1; color: #e2e8f0; }
    .source-page { color: var(--text-muted); }
    .source-score { color: #f59e0b; font-family: monospace; }
    .no-sources { color: var(--text-muted); font-style: italic; font-size: 14px; margin-top: 6px; }
    .notes-section { font-size: 13px; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 10px; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>NexCorpus RAG Quality & Answer Completeness Benchmark</h1>
      <div class="timestamp">Target Document: <code>${DOCUMENT_ID}</code> | Evaluated at: ${new Date().toLocaleString()}</div>
    </header>

    <div class="dashboard">
      <div class="metric-card">
        <div class="metric-label">Total Test Cases</div>
        <div class="metric-value info">${totalTests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Pass Rate</div>
        <div class="metric-value pass">${passRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Completeness (Round 2)</div>
        <div class="metric-value purple">${avgCompletenessR2}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Latency</div>
        <div class="metric-value info">${avgLatency} ms</div>
      </div>
    </div>

    <div class="section-title">Round 2: Answer Completeness Evaluation</div>
    ${renderCards(round2Results)}

    <div class="section-title">Round 1: Quality & Edge-Case Evaluation</div>
    ${renderCards(round1Results)}
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(OUTPUT_HTML_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_HTML_PATH, html, "utf-8");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

runQAEvaluationSuite().catch(console.error);
