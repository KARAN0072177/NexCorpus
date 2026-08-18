"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  User,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CitedSource {
  id: string;
  sectionPath: string[];
  pageStart: number;
  pageEnd: number;
  score: number;
}

export interface ChatMessageItem extends ConversationMessage {
  id: string;
  timestamp: string;
  sources?: CitedSource[];
}

interface DocumentInfo {
  id: string;
  originalFilename: string;
  size: number;
  mimeType: string;
  extension: string;
  storageStatus: string;
  securityStatus: string;
  processingStatus: string;
  indexingStatus: string;
}

interface DocumentChatWorkspaceProps {
  documentId: string;
  username?: string;
}

export default function DocumentChatWorkspace({
  documentId,
  username = "User",
}: DocumentChatWorkspaceProps) {
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStatusMessage, setIndexingStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const SUGGESTED_PROMPTS = [
    "Summarize the main topics in this document.",
    "What technologies and frameworks are mentioned?",
    "List every AWS service and where it was used.",
    "Compare all projects by database, auth, and cloud stack.",
    "Summarize all authentication and security measures.",
  ];

  async function loadDocumentDetails() {
    try {
      const res = await fetch(`/api/documents`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data.documents) {
        const found = data.documents.find((d: DocumentInfo) => d.id === documentId);

        if (found) {
          setDocumentInfo(found);
        }
      }
    } catch (e) {
      console.error("Failed to fetch document metadata:", e);
    }
  }

  useEffect(() => {
    loadDocumentDetails();
  }, [documentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function toggleSources(messageId: string) {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }

  async function handleTriggerIndexing() {
    setError(null);
    setIsIndexing(true);
    setIndexingStatusMessage("1/4 Extracting PDF text & structural blocks...");

    try {
      // Step 1: Process document text
      const processRes = await fetch(`/api/documents/${documentId}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const pData = await processRes.json();
        throw new Error(pData.error || "Failed to process document text");
      }

      // Step 2: Document AI Semantic Analysis
      setIndexingStatusMessage("2/4 Performing AI semantic analysis...");
      const analyzeRes = await fetch(`/api/documents/${documentId}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.ok) {
        const aData = await analyzeRes.json();
        throw new Error(aData.error || "Failed to analyze document structure");
      }

      // Step 3: Create sub-category chunks
      setIndexingStatusMessage("3/4 Creating sub-category granular chunks...");
      const chunksRes = await fetch(`/api/documents/${documentId}/chunks`, {
        method: "POST",
      });

      if (!chunksRes.ok) {
        const cData = await chunksRes.json();
        throw new Error(cData.error || "Failed to create document chunks");
      }

      // Step 4: Embed & Index into MongoDB Atlas Vector Search
      setIndexingStatusMessage("4/4 Generating OpenAI embeddings & indexing into MongoDB Atlas...");
      const embedRes = await fetch(`/api/documents/${documentId}/embeddings`, {
        method: "POST",
      });

      if (!embedRes.ok) {
        const eData = await embedRes.json();
        throw new Error(eData.error || "Failed to generate document embeddings");
      }

      setIndexingStatusMessage("Indexing complete! Document is ready for RAG Q&A.");
      await loadDocumentDetails();

      setTimeout(() => {
        setIndexingStatusMessage("");
      }, 3000);
    } catch (err: any) {
      console.error("Manual indexing failed:", err);
      setError(err.message || "Failed to index document.");
    } finally {
      setIsIndexing(false);
    }
  }

  async function handleSendMessage(queryText?: string) {
    const textToSend = (queryText ?? inputQuery).trim();

    if (!textToSend || isLoading) return;

    if (documentInfo && documentInfo.indexingStatus !== "COMPLETED") {
      setError(
        "This document has not been indexed into MongoDB Atlas Search yet. Click 'Process & Index Document Now' above to generate chunks and embeddings."
      );
      return;
    }

    setError(null);
    setInputQuery("");

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessageItem = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationPayload: ConversationMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`/api/documents/${documentId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          conversation: conversationPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get an answer from NexCorpus RAG.");
      }

      const assistantMsgId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessageItem = {
        id: assistantMsgId,
        role: "assistant",
        content: data.data.answer,
        sources: data.data.sources,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function renderMarkdownAnswer(content: string) {
    if (content.includes("|") && content.includes("-")) {
      const lines = content.split("\n");
      const tableLines = lines.filter((line) => line.trim().startsWith("|"));

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);

        const rowLines = tableLines.slice(2);

        return (
          <div className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 shadow-xl">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {headerCells.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-semibold text-sky-400">
                      {h.replace(/\*\*/g, "")}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {rowLines.map((rLine, rIdx) => {
                  const cells = rLine
                    .split("|")
                    .map((c) => c.trim())
                    .filter(Boolean);

                  return (
                    <tr key={rIdx} className="hover:bg-white/[0.02]">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-3 text-slate-300">
                          {cell.startsWith("**") && cell.endsWith("**") ? (
                            <strong className="text-white">{cell.replace(/\*\*/g, "")}</strong>
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }

    return (
      <div className="space-y-3 whitespace-pre-wrap leading-relaxed text-slate-200">
        {content}
      </div>
    );
  }

  const isFullyIndexed = documentInfo?.indexingStatus === "COMPLETED";

  return (
    <div className="flex h-screen w-full flex-col bg-[#0b0f17] text-white">
      {/* Header Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0f172a]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Workspace
          </Link>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <FileText className="h-4 w-4" />
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">
                {documentInfo?.originalFilename || `Document ${documentId.slice(-6)}`}
              </h1>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isFullyIndexed ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span>
                  {isFullyIndexed
                    ? "Ready for Grounded Q&A"
                    : `Indexing Status: ${documentInfo?.indexingStatus || "NOT_STARTED"}`}
                </span>
                <span>•</span>
                <span>ID: {documentId}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isFullyIndexed && (
            <button
              onClick={handleTriggerIndexing}
              disabled={isIndexing}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isIndexing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              <span>{isIndexing ? "Processing..." : "Process & Index Document Now"}</span>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span>@{username}</span>
          </div>
        </div>
      </header>

      {/* Indexing Warning Banner */}
      {!isFullyIndexed && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Document Not Indexed Yet:</strong> This document currently has{" "}
              <code className="font-mono text-amber-300">
                indexingStatus: {documentInfo?.indexingStatus || "NOT_STARTED"}
              </code>
              . Vector chunks must be created before RAG search can retrieve answers.
            </span>
          </div>

          <button
            onClick={handleTriggerIndexing}
            disabled={isIndexing}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {isIndexing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <PlayCircle className="h-3 w-3" />
            )}
            <span>{isIndexing ? "Indexing..." : "Index Now"}</span>
          </button>
        </div>
      )}

      {indexingStatusMessage && (
        <div className="bg-sky-500/10 border-b border-sky-500/30 px-6 py-2 text-xs font-mono text-sky-300">
          {indexingStatusMessage}
        </div>
      )}

      {/* Main Chat Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Details Panel */}
        <aside className="hidden w-72 flex-col border-r border-white/10 bg-[#0d1322] p-5 lg:flex">
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Document Context
            </h2>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <p className="text-xs font-medium text-white truncate">
                {documentInfo?.originalFilename || "Target Document"}
              </p>

              <div className="mt-3 space-y-2 text-[12px] text-slate-400">
                <div className="flex justify-between">
                  <span>MIME Type:</span>
                  <span className="font-mono text-slate-300">
                    {documentInfo?.mimeType || "application/pdf"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Indexing:</span>
                  <span
                    className={`font-semibold ${
                      isFullyIndexed ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {documentInfo?.indexingStatus || "NOT_STARTED"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Atlas Search:</span>
                  <span className="text-sky-400">Hybrid BM25 + Vector</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Suggested Questions
            </h2>

            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(promptText)}
                  disabled={isLoading || isIndexing}
                  className="w-full text-left rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300 transition hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-white disabled:opacity-50"
                >
                  "{promptText}"
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-sky-500/10 bg-sky-500/5 p-3 text-[11px] text-sky-300/80">
            <p className="font-semibold text-sky-400">Strict Grounding Active</p>
            <p className="mt-1">
              Answers are strictly synthesized from document chunks with citation mapping.
            </p>
          </div>
        </aside>

        {/* Center Messages Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-[#0b0f17]">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Empty State */}
              {messages.length === 0 && (
                <div className="my-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/5">
                    <Sparkles className="h-7 w-7" />
                  </div>

                  <h2 className="text-xl font-semibold text-white">
                    Conversational Document RAG
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                    Ask questions, run multi-project comparisons, or explore technical details.
                    NexCorpus will retrieve exact chunks and generate grounded answers.
                  </p>

                  <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SUGGESTED_PROMPTS.slice(0, 4).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(p)}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left text-xs font-medium text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-white"
                      >
                        <span className="text-sky-400">→</span> "{p}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                      <Bot className="h-5 w-5" />
                    </div>
                  )}

                  <div
                    className={`group relative max-w-2xl rounded-2xl px-5 py-4 ${
                      message.role === "user"
                        ? "bg-sky-600 text-white"
                        : "border border-white/10 bg-[#131b2e] text-slate-100 shadow-xl"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-4 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {message.role === "user" ? "You" : "NexCorpus Assistant"}
                      </span>

                      <span>{message.timestamp}</span>
                    </div>

                    <div className="mt-2">{renderMarkdownAnswer(message.content)}</div>

                    {/* Cited Sources Accordion */}
                    {message.role === "assistant" &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="mt-4 border-t border-white/10 pt-3">
                          <button
                            onClick={() => toggleSources(message.id)}
                            className="flex items-center gap-2 text-xs font-semibold text-sky-400 transition hover:text-sky-300"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>
                              {message.sources.length}{" "}
                              {message.sources.length === 1 ? "Source Cited" : "Sources Cited"}
                            </span>
                            {expandedSources[message.id] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {expandedSources[message.id] && (
                            <div className="mt-3 space-y-2">
                              {message.sources.map((src, sIdx) => (
                                <div
                                  key={src.id || sIdx}
                                  className="rounded-lg border border-white/5 bg-slate-950/60 p-3 text-xs"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="rounded bg-sky-500/20 px-2 py-0.5 font-bold text-sky-300">
                                      Source {sIdx + 1}
                                    </span>

                                    <span className="font-mono text-amber-400">
                                      Score: {src.score.toFixed(4)}
                                    </span>
                                  </div>

                                  <div className="mt-2 text-slate-300 font-medium">
                                    {src.sectionPath.join(" > ") || "Document Chunk"}
                                  </div>

                                  <div className="mt-1 text-[11px] text-slate-500">
                                    Page range: {src.pageStart} - {src.pageEnd}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State Indicator */}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#131b2e] px-5 py-4 text-xs text-slate-400 shadow-xl">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                      <span>
                        NexCorpus AI is analyzing document context and synthesizing grounded answer...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                  <p className="font-semibold">Query Warning / Error</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="shrink-0 border-t border-white/10 bg-[#0f172a]/90 p-4 backdrop-blur-md">
            <div className="mx-auto max-w-3xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl transition-within focus-within:border-sky-500/50"
              >
                <textarea
                  ref={inputRef}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about this document..."
                  rows={1}
                  disabled={isLoading || isIndexing}
                  className="w-full resize-none bg-transparent px-5 py-4 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading || isIndexing}
                  className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white transition hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-500">
                <span>Press Enter to send, Shift + Enter for newline</span>
                <span>Powered by OpenAI & Atlas Search</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
