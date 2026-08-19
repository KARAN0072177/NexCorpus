"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  RefreshCw,
  Send,
  Sparkles,
  User,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import SidebarSkeleton from "./sidebar-skeleton";
import UserProfileModal, { UserProfileData } from "@/app/components/auth/user-profile-modal";
import UserAvatar from "@/app/components/auth/user-avatar";
import DocumentRenameModal from "@/app/components/documents/document-rename-modal";
import DocumentDeleteModal from "@/app/components/documents/document-delete-modal";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CitedSource {
  id: string;
  sectionPath: string[];
  pageStart: number;
  pageEnd: number;
  snippetText: string;
  similarityScore: number;
  rank: number;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CitedSource[];
  timestamp: string;
}

interface DocumentInfo {
  id: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
  storageStatus: string;
  securityStatus: string;
  processingStatus: string;
  indexingStatus: string;
}

interface DocumentChatWorkspaceProps {
  documentId: string;
  username?: string;
  user?: UserProfileData;
}

export default function DocumentChatWorkspace({
  documentId,
  username = "User",
  user,
}: DocumentChatWorkspaceProps) {
  const router = useRouter();
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeClickedPrompt, setActiveClickedPrompt] = useState<string | null>(null);
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
    "Summarize key takeaways from this document.",
    "What main topics or sections are covered?",
    "What tools, skills, or features are highlighted?",
    "List all major projects or items described.",
    "Give me a concise 3-bullet executive summary.",
  ];

  async function loadDocumentDetails() {
    try {
      setIsDocumentLoading(true);
      const res = await fetch(`/api/documents`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data.documents) {
        const found = data.documents.find((d: DocumentInfo) => d.id === documentId);

        if (found) {
          setDocumentInfo(found);
          if (found.indexingStatus !== "COMPLETED") {
            handleTriggerIndexing();
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch document metadata:", e);
    } finally {
      setIsDocumentLoading(false);
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
    setIndexingStatusMessage("Reading document text...");

    try {
      // Step 1: Process document text
      const processRes = await fetch(`/api/documents/${documentId}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const pData = await processRes.json();
        throw new Error(pData.error || "Unable to read document text");
      }

      // Step 2: Document AI Semantic Analysis
      setIndexingStatusMessage("Analyzing document sections...");
      const analyzeRes = await fetch(`/api/documents/${documentId}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.ok) {
        const aData = await analyzeRes.json();
        throw new Error(aData.error || "Unable to analyze document sections");
      }

      // Step 3: Create chunks
      setIndexingStatusMessage("Organizing content topics...");
      const chunksRes = await fetch(`/api/documents/${documentId}/chunks`, {
        method: "POST",
      });

      if (!chunksRes.ok) {
        const cData = await chunksRes.json();
        throw new Error(cData.error || "Unable to organize content topics");
      }

      // Step 4: Embed & Index
      setIndexingStatusMessage("Building smart search index...");
      const embedRes = await fetch(`/api/documents/${documentId}/embeddings`, {
        method: "POST",
      });

      if (!embedRes.ok) {
        const eData = await embedRes.json();
        throw new Error(eData.error || "Unable to build search index");
      }

      setIndexingStatusMessage("Setup complete! Your document is ready to answer questions.");
      await loadDocumentDetails();

      setTimeout(() => {
        setIndexingStatusMessage("");
      }, 3000);
    } catch (err: any) {
      console.error("Manual indexing failed:", err);
      setError(err.message || "Unable to prepare document.");
    } finally {
      setIsIndexing(false);
    }
  }

  async function handleSendMessage(queryText?: string) {
    const textToSend = (queryText ?? inputQuery).trim();

    if (!textToSend || isLoading) return;

    if (documentInfo && documentInfo.indexingStatus !== "COMPLETED") {
      setError(
        "This document is still being set up. Click 'Prepare Document Now' above to start asking questions."
      );
      return;
    }

    if (queryText) {
      setActiveClickedPrompt(queryText);
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

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMessage: ChatMessageItem = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      sources: [],
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
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
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to get an answer. Please try again.");
      }

      if (!res.body) {
        throw new Error("No response stream body received");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let tokenBufferQueue = "";
      let isStreamFinished = false;

      // Smooth typing interpolation interval (15ms ticks)
      const typingInterval = setInterval(() => {
        if (tokenBufferQueue.length > 0) {
          // Dynamic step size: if queue grows, type faster to maintain low latency
          const stepSize =
            tokenBufferQueue.length > 40
              ? 8
              : tokenBufferQueue.length > 20
              ? 4
              : tokenBufferQueue.length > 10
              ? 2
              : 1;

          const chunkToType = tokenBufferQueue.slice(0, stepSize);
          tokenBufferQueue = tokenBufferQueue.slice(stepSize);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + chunkToType }
                : msg
            )
          );
        } else if (isStreamFinished) {
          clearInterval(typingInterval);
        }
      }, 15);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") break;

            try {
              const event = JSON.parse(dataStr);

              if (event.type === "sources") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, sources: event.sources }
                      : msg
                  )
                );
              } else if (event.type === "token") {
                tokenBufferQueue += event.content;
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch {
              // Ignore incomplete line chunks
            }
          }
        }
      } finally {
        isStreamFinished = true;
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "An unexpected issue occurred. Please try again.");
      // Clean up empty assistant message if failed
      setMessages((prev) =>
        prev.filter((m) => m.id !== assistantMsgId || m.content.length > 0)
      );
    } finally {
      setIsLoading(false);
      setActiveClickedPrompt(null);
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
    const trimmed = content.trim();

    // 1. Clean Card Parser for JSON answers
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);

        if (typeof parsed === "object" && parsed !== null) {
          const rawEntries = Array.isArray(parsed)
            ? parsed.map((item, idx) => [`Item ${idx + 1}`, item] as [string, any])
            : Object.entries(parsed);

          return (
            <div className="my-3 space-y-4">
              {rawEntries.map((entry: [string, any], idx: number) => {
                const [key, val] = entry;
                const title = val?.service || key;
                const usages = Array.isArray(val)
                  ? val
                  : Array.isArray(val?.usage)
                  ? val.usage
                  : typeof val === "object"
                  ? [val]
                  : [{ description: String(val) }];

                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-xl border border-sky-500/20 bg-slate-900/80 p-4 shadow-lg transition hover:border-sky-500/40"
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-xs font-bold text-sky-400">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-sky-300">
                        {title.replace(/\*\*/g, "")}
                      </h4>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {usages.map((uItem: any, uIdx: number) => (
                        <div key={uIdx} className="flex flex-col sm:flex-row sm:items-start gap-2 text-xs">
                          {uItem.project && (
                            <span className="inline-flex shrink-0 items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium text-[11px] text-amber-300">
                              {uItem.project}
                            </span>
                          )}
                          <p className="text-slate-200 leading-relaxed">
                            {uItem.description || uItem.usage || JSON.stringify(uItem)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
      } catch {
        // Fall back to Markdown parsing if JSON fails
      }
    }

    // 2. Markdown Table Parser
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

    // 3. Human-Readable Markdown Parser
    const lines = content.split("\n");

    return (
      <div className="space-y-2.5 text-sm leading-relaxed text-slate-200">
        {lines.map((line, lIdx) => {
          const trimmedLine = line.trim();

          if (!trimmedLine) return <div key={lIdx} className="h-1" />;

          // Headings
          if (trimmedLine.startsWith("###") || trimmedLine.startsWith("##")) {
            const headingText = trimmedLine.replace(/^#+\s*/, "").replace(/\*\*/g, "");
            return (
              <h3 key={lIdx} className="mt-4 mb-2 text-base font-bold text-sky-400">
                {headingText}
              </h3>
            );
          }

          // Bullet List Items
          if (trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
            const listText = trimmedLine.replace(/^[-*]\s*/, "");
            
            const projectMatch = listText.match(/\*\*\[(.*?)\]\*\*\s*(.*)/);

            if (projectMatch) {
              const [, projName, descText] = projectMatch;
              return (
                <div key={lIdx} className="flex items-start gap-2.5 my-1.5 pl-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                  <div>
                    <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium text-[11px] text-amber-300 mr-2">
                      {projName}
                    </span>
                    <span>{descText}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={lIdx} className="flex items-start gap-2.5 my-1 pl-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                <span>{renderBoldInlineText(listText)}</span>
              </div>
            );
          }

          return <p key={lIdx}>{renderBoldInlineText(trimmedLine)}</p>;
        })}
      </div>
    );
  }

  function renderBoldInlineText(text: string) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  }

  const isFullyIndexed = documentInfo?.indexingStatus === "COMPLETED";
  const fileExtensionUpper = (documentInfo?.extension || "PDF").replace(".", "").toUpperCase();

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
                {documentInfo?.originalFilename || "Document Assistant"}
              </h1>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isFullyIndexed ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span>
                  {isFullyIndexed ? "Ready to Answer" : "Setting Up Document..."}
                </span>
                <span>•</span>
                <span className="font-medium text-slate-300">{fileExtensionUpper} Document</span>
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
              <span>{isIndexing ? "Setting Up..." : "Prepare Document Now"}</span>
            </button>
          )}

            <button
              type="button"
              onClick={() => setIsRenameOpen(true)}
              title="Rename Document"
              aria-label="Rename Document"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              title="Delete Document"
              aria-label="Delete Document"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 py-1 pl-1.5 pr-3 text-xs text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
            >
              <UserAvatar
                image={user?.image}
                email={user?.email}
                name={user?.name}
                username={username}
                size="xs"
              />
              <span className="font-medium">@{username}</span>
            </button>
          </div>
      </header>

      {/* User Profile Popup Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user ?? { username }}
      />

      {/* Rename Modal */}
      {documentInfo && (
        <DocumentRenameModal
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          documentId={documentInfo.id}
          currentFilename={documentInfo.originalFilename}
          onRenamed={(_docId, newName) => {
            setDocumentInfo((prev) =>
              prev ? { ...prev, originalFilename: newName } : null
            );
          }}
        />
      )}

      {/* Delete Modal */}
      {documentInfo && (
        <DocumentDeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          documentId={documentInfo.id}
          filename={documentInfo.originalFilename}
          onDeleted={() => {
            router.push("/");
          }}
        />
      )}

      {/* Indexing Warning Banner */}
      {!isFullyIndexed && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Document Setup Required:</strong> This document needs a quick one-time setup before you can ask questions.
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
            <span>{isIndexing ? "Setting Up..." : "Prepare Document"}</span>
          </button>
        </div>
      )}

      {indexingStatusMessage && (
        <div className="bg-sky-500/10 border-b border-sky-500/30 px-6 py-2 text-xs font-medium text-sky-300">
          {indexingStatusMessage}
        </div>
      )}

      {/* Main Chat Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Details Panel */}
        <aside className="hidden w-72 flex-col border-r border-white/10 bg-[#0d1322] p-5 lg:flex">
          {isDocumentLoading ? (
            <SidebarSkeleton />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Document Overview
                </h2>

                <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-xs font-medium text-white truncate">
                    {documentInfo?.originalFilename || "Selected Document"}
                  </p>

                  <div className="mt-3 space-y-2.5 text-[12px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="font-medium text-slate-200">
                        {fileExtensionUpper} Document
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span
                        className={`font-semibold ${
                          isFullyIndexed ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {isFullyIndexed ? "Ready to Answer" : "Preparing"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Search Engine:</span>
                      <span className="text-sky-400 font-medium">Smart Hybrid Search</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Suggested Questions
                </h2>

                <div className="space-y-2">
                  {SUGGESTED_PROMPTS.map((promptText, i) => {
                    const isCurrentPromptLoading = activeClickedPrompt === promptText && isLoading;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(promptText)}
                        disabled={isLoading || isIndexing}
                        className="w-full flex items-center justify-between text-left rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300 transition hover:border-sky-500/30 hover:bg-sky-500/5 hover:text-white disabled:opacity-50"
                      >
                        <span>"{promptText}"</span>
                        {isCurrentPromptLoading && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3.5 text-[11px] text-sky-300">
                <p className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Verified Source Guarantee</span>
                </p>
                <p className="mt-1 text-slate-300">
                  Answers are directly created from your document content with verified section references.
                </p>
              </div>
            </>
          )}
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
                    Smart Document Assistant
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                    Ask any question about your document. NexCorpus will review all sections and provide accurate, verified answers.
                  </p>

                  <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SUGGESTED_PROMPTS.slice(0, 4).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(p)}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left text-xs font-medium text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-white"
                      >
                        <span className="text-sky-400 mr-1.5">→</span> "{p}"
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

                    <div className="mt-2 relative">
                      {renderMarkdownAnswer(message.content)}
                      {message.role === "assistant" && isLoading && message.content.length > 0 && (
                        <span className="inline-block h-3.5 w-1.5 ml-1 bg-sky-400 animate-pulse font-bold align-middle rounded-sm" />
                      )}
                    </div>

                    {/* Cited Sources Accordion */}
                    {message.role === "assistant" &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="mt-4 border-t border-white/10 pt-3">
                          <button
                            onClick={() => toggleSources(message.id)}
                            className="flex items-center gap-2 text-xs font-semibold text-sky-400 transition hover:text-sky-300"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>
                              {message.sources.length}{" "}
                              {message.sources.length === 1 ? "Reference Cited" : "References Cited"}
                            </span>
                            {expandedSources[message.id] ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {expandedSources[message.id] && (
                            <div className="mt-3 space-y-2">
                              {message.sources.map((src, sIdx) => {
                                const pageLabel =
                                  src.pageStart === src.pageEnd
                                    ? `Page ${src.pageStart}`
                                    : `Pages ${src.pageStart}–${src.pageEnd}`;

                                return (
                                  <div
                                    key={src.id || sIdx}
                                    className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs"
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="rounded-md bg-sky-500/20 px-2 py-0.5 font-bold text-sky-300">
                                        Reference {sIdx + 1}
                                      </span>

                                      <span className="font-medium text-emerald-400">
                                        Relevance: High Match
                                      </span>
                                    </div>

                                    <div className="mt-2 text-slate-200 font-medium">
                                      Found in Section: {src.sectionPath.join(" > ") || "Document Section"}
                                    </div>

                                    <div className="mt-1 text-[11px] text-slate-400">
                                      Location: {pageLabel} of Document
                                    </div>
                                  </div>
                                );
                              })}
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

              {/* Loading State Indicator (Only visible before token generation starts) */}
              {isLoading && messages.some((m) => m.role === "assistant" && m.content.length === 0) && (
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#131b2e] px-5 py-4 text-xs text-slate-400 shadow-xl">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                      <span>
                        NexCorpus is reviewing your document content to generate a verified answer...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                  <p className="font-semibold font-sans">Notice</p>
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
                  placeholder="Ask any question about this document..."
                  rows={1}
                  disabled={isLoading || isIndexing}
                  className="w-full resize-none bg-transparent px-5 py-4 text-sm text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading || isIndexing}
                  className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white transition hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>

              <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-500">
                <span>Press Enter to send, Shift + Enter for newline</span>
                <span>Powered by NexCorpus AI Intelligence</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
