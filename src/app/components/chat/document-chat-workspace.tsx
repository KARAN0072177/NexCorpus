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
  Plus,
  MessageSquare,
  History,
  Check,
  X,
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
  snippetText?: string;
  similarityScore?: number;
  rank?: number;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CitedSource[];
  timestamp: string;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(
    user || null
  );
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Sync user prop and fetch full profile if avatar/email missing
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  useEffect(() => {
    if (!currentUser?.image || !currentUser?.email) {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setCurrentUser((prev) => ({
              ...prev,
              ...data.user,
            }));
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.image, currentUser?.email]);

  // Chat History & Sessions
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<ChatSessionItem | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Messages & Query State
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

  // 1. Load Document Details
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

  // 2. Load Chat Sessions for this Document
  async function loadChatSessions(autoSelectLatest = true) {
    try {
      setIsLoadingSessions(true);
      const res = await fetch(`/api/documents/${documentId}/chats`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions);

        if (autoSelectLatest && data.sessions.length > 0 && !activeSessionId) {
          const latest = data.sessions[0];
          setActiveSessionId(latest.id);
          await loadSessionMessages(latest.id);
        }
      }
    } catch (e) {
      console.error("Failed to load chat sessions:", e);
    } finally {
      setIsLoadingSessions(false);
    }
  }

  // 3. Load Messages of a Specific Session
  async function loadSessionMessages(sessionId: string) {
    try {
      setError(null);
      const res = await fetch(
        `/api/documents/${documentId}/chats/${sessionId}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (res.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load session messages:", e);
      setError("Failed to load chat history.");
    }
  }

  useEffect(() => {
    loadDocumentDetails();
    loadChatSessions(true);
  }, [documentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Switch Active Session
  async function handleSelectSession(sessionId: string) {
    if (isLoading || activeSessionId === sessionId) return;
    setActiveSessionId(sessionId);
    await loadSessionMessages(sessionId);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Start a New Chat
  function handleNewChat() {
    if (isLoading) return;
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Rename Session
  async function handleSaveRename(sessionId: string) {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/documents/${documentId}/chats/${sessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        }
      );

      const data = await res.json();

      if (res.ok && data.session) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, title: data.session.title } : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to rename session:", err);
    } finally {
      setEditingSessionId(null);
    }
  }

  // Delete Session
  async function handleConfirmDeleteSession() {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);

    try {
      const res = await fetch(
        `/api/documents/${documentId}/chats/${sessionToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        const remaining = sessions.filter((s) => s.id !== sessionToDelete.id);
        setSessions(remaining);

        if (activeSessionId === sessionToDelete.id) {
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            await loadSessionMessages(remaining[0].id);
          } else {
            handleNewChat();
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    } finally {
      setIsDeletingSession(false);
      setSessionToDelete(null);
    }
  }

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
      const processRes = await fetch(`/api/documents/${documentId}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const pData = await processRes.json();
        throw new Error(pData.error || "Unable to read document text");
      }

      setIndexingStatusMessage("Analyzing document sections...");
      const analyzeRes = await fetch(`/api/documents/${documentId}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.ok) {
        const aData = await analyzeRes.json();
        throw new Error(aData.error || "Unable to analyze document sections");
      }

      setIndexingStatusMessage("Organizing content topics...");
      const chunksRes = await fetch(`/api/documents/${documentId}/chunks`, {
        method: "POST",
      });

      if (!chunksRes.ok) {
        const cData = await chunksRes.json();
        throw new Error(cData.error || "Unable to organize content topics");
      }

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

    setError(null);
    setInputQuery("");

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessageItem = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMessage: ChatMessageItem = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      sources: [],
      timestamp: new Date().toISOString(),
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
          sessionId: activeSessionId || undefined,
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

              if (event.type === "session") {
                // If a new session was created on the server, track it
                const newSid = event.sessionId;
                setActiveSessionId(newSid);

                setSessions((prev) => {
                  const exists = prev.some((s) => s.id === newSid);
                  if (exists) {
                    return prev.map((s) =>
                      s.id === newSid
                        ? { ...s, title: event.title || s.title, updatedAt: new Date().toISOString() }
                        : s
                    );
                  }
                  return [
                    {
                      id: newSid,
                      title: event.title || textToSend.slice(0, 50),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                    ...prev,
                  ];
                });
              } else if (event.type === "sources") {
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
              // Ignore incomplete chunks
            }
          }
        }
      } finally {
        isStreamFinished = true;
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "An unexpected issue occurred. Please try again.");
      setMessages((prev) =>
        prev.filter((m) => m.id !== assistantMsgId || m.content.length > 0)
      );
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

  function formatMessageTime(timestamp?: string): string {
    if (!timestamp) return "";
    if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(timestamp.trim())) {
      return timestamp.trim();
    }
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      return "";
    }
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getFollowUpPrompts(chatMessages: ChatMessageItem[]): string[] {
    const allPrompts = [
      "Can you summarize this into 3 concise executive takeaways?",
      "What are the main architecture, tech stack, or design decisions?",
      "What security measures, risks, or edge cases are highlighted?",
      "Explain the key milestones, projects, or deliverables mentioned.",
      "What are the next steps or recommendations outlined?",
      "Can you provide a deeper breakdown of the primary section?",
    ];

    const userQueries = chatMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content.toLowerCase());

    const available = allPrompts.filter(
      (p) => !userQueries.some((q) => q.includes(p.toLowerCase().slice(0, 20)))
    );

    return available.slice(0, 3);
  }

  function parseInlineMarkdown(text: string): React.ReactNode[] {
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return tokens.map((token, idx) => {
      if (!token) return null;

      if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        return (
          <code
            key={idx}
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-sky-300"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }

      if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
        return (
          <em key={idx} className="italic text-slate-200">
            {token.slice(1, -1)}
          </em>
        );
      }

      return <span key={idx}>{token}</span>;
    });
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
        // Fall back to text parsing
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
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-4 py-2.5 font-semibold text-sky-300 text-xs uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rowLines.map((row, rIdx) => {
                  const cells = row
                    .split("|")
                    .map((c) => c.trim())
                    .filter(Boolean);
                  return (
                    <tr key={rIdx} className="hover:bg-white/[0.02]">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 text-xs text-slate-200">
                          {parseInlineMarkdown(cell)}
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

    // 3. Line-by-Line Markdown Parser (Headers, Nested Lists, Code, Inline Formatting)
    const lines = content.split("\n");

    return (
      <div className="space-y-1 text-xs leading-relaxed text-slate-100">
        {lines.map((rawLine, idx) => {
          const trimmedLine = rawLine.trim();

          if (!trimmedLine) {
            return <div key={idx} className="h-2" />;
          }

          // Headers
          if (trimmedLine.startsWith("### ")) {
            return (
              <h4 key={idx} className="font-bold text-sky-300 text-sm mt-3 mb-1">
                {parseInlineMarkdown(trimmedLine.slice(4))}
              </h4>
            );
          }
          if (trimmedLine.startsWith("## ")) {
            return (
              <h3 key={idx} className="font-bold text-white text-sm mt-3 mb-1.5">
                {parseInlineMarkdown(trimmedLine.slice(3))}
              </h3>
            );
          }
          if (trimmedLine.startsWith("# ")) {
            return (
              <h2 key={idx} className="font-bold text-white text-base mt-3.5 mb-1.5">
                {parseInlineMarkdown(trimmedLine.slice(2))}
              </h2>
            );
          }

          // List Items (Bullet & Numbered & Nested)
          const listMatch = rawLine.match(/^(\s*)([-*•]|\d+\.)\s+(.*)$/);
          const doubleDashMatch = rawLine.match(/^(\s*)-\s+-\s+(.*)$/);

          if (doubleDashMatch) {
            const cleanContent = doubleDashMatch[2].trim();
            return (
              <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 my-0.5 ml-5">
                <span className="text-slate-500 font-bold shrink-0">–</span>
                <span className="flex-1">{parseInlineMarkdown(cleanContent)}</span>
              </div>
            );
          }

          if (listMatch) {
            const indentSpaces = listMatch[1].length;
            const marker = listMatch[2];
            let cleanContent = listMatch[3].trim();

            // Strip nested leading dash artifact if present (e.g. "- **Item**")
            if (cleanContent.startsWith("- ")) {
              cleanContent = cleanContent.slice(2).trim();
            }

            const isNested = indentSpaces >= 2;

            if (isNested) {
              return (
                <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 my-0.5 ml-5">
                  <span className="text-slate-500 font-bold shrink-0">–</span>
                  <span className="flex-1">{parseInlineMarkdown(cleanContent)}</span>
                </div>
              );
            }

            const isNumbered = /^\d+\./.test(marker);

            return (
              <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-200 my-1">
                <span className={isNumbered ? "text-sky-400 font-mono text-[11px] font-bold shrink-0" : "text-sky-400 font-bold shrink-0 mt-0.5"}>
                  {isNumbered ? marker : "•"}
                </span>
                <span className="flex-1">{parseInlineMarkdown(cleanContent)}</span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} className="text-xs leading-relaxed text-slate-200 my-1">
              {parseInlineMarkdown(trimmedLine)}
            </p>
          );
        })}
      </div>
    );
  }

  const isFullyIndexed = documentInfo?.indexingStatus === "COMPLETED";
  const fileExtensionUpper = (documentInfo?.extension?.replace(".", "") || "PDF").toUpperCase();

  return (
    <div className="flex h-screen flex-col bg-[#0a0e17] text-white">
      {/* Top Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0d1322] px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Back to Documents"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 font-bold text-xs">
              {fileExtensionUpper}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md">
                  {documentInfo?.originalFilename || "Loading Document..."}
                </h1>
                <button
                  onClick={() => setIsRenameOpen(true)}
                  title="Rename document"
                  className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsDeleteOpen(true)}
                  title="Delete document"
                  className="rounded-md p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isFullyIndexed ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span>{isFullyIndexed ? "AI Knowledge Ready" : "Preparing Index..."}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1.5 pl-2 pr-3.5 text-xs text-slate-200 transition hover:border-sky-500/40 hover:bg-white/10"
          >
            <UserAvatar
              image={user?.image}
              email={user?.email}
              name={user?.name}
              username={username}
              size="sm"
            />
            <span className="font-semibold text-white">@{username}</span>
          </button>
        </div>
      </header>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      {/* Document Rename Modal */}
      {documentInfo && (
        <DocumentRenameModal
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          documentId={documentInfo.id}
          currentFilename={documentInfo.originalFilename}
          onRenamed={(_id, newFilename) => {
            setDocumentInfo((prev) =>
              prev ? { ...prev, originalFilename: newFilename } : prev
            );
          }}
        />
      )}

      {/* Document Delete Modal */}
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

      {/* Delete Chat Session Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Delete Conversation</h3>
                <p className="text-xs text-slate-400">This will remove this chat history.</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-300 line-clamp-2">
              "{sessionToDelete.title}"
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeletingSession}
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                disabled={isDeletingSession}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeletingSession ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indexing Alert Banner */}
      {!isFullyIndexed && (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              This document is being set up. Run setup to enable verified AI answers.
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
        {/* Left Side ChatGPT / Gemini Style Chat History Panel */}
        <aside className="hidden w-72 flex-col border-r border-white/10 bg-[#0d1322] lg:flex">
          {isDocumentLoading ? (
            <div className="p-5">
              <SidebarSkeleton />
            </div>
          ) : (
            <div className="flex h-full flex-col p-4">
              {/* "+ New Chat" Button */}
              <button
                onClick={handleNewChat}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-500/15 to-indigo-500/15 px-4 py-2.5 text-xs font-semibold text-sky-300 shadow-sm transition hover:border-sky-500/50 hover:bg-sky-500/25 hover:text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4 text-sky-400" />
                <span>New Chat</span>
              </button>

              {/* Chat History Header */}
              <div className="mt-5 mb-2.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <History className="h-3.5 w-3.5 text-sky-400" />
                <span>Chat History</span>
              </div>

              {/* Chat Sessions Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {isLoadingSessions ? (
                  <div className="space-y-2 p-2">
                    <div className="h-9 w-full rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-9 w-full rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-9 w-full rounded-xl bg-white/5 animate-pulse" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <MessageSquare className="mx-auto h-7 w-7 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No past conversations</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Start asking questions to create chat sessions.
                    </p>
                  </div>
                ) : (
                  sessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    const isEditing = editingSessionId === session.id;

                    if (isEditing) {
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-1 rounded-xl border border-sky-500/40 bg-slate-900/90 p-1.5"
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(session.id);
                              if (e.key === "Escape") setEditingSessionId(null);
                            }}
                            autoFocus
                            className="w-full bg-transparent px-2 text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => handleSaveRename(session.id)}
                            className="rounded p-1 text-emerald-400 hover:bg-white/10"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSessionId(null)}
                            className="rounded p-1 text-slate-400 hover:bg-white/10"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group relative flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-xs transition ${
                          isActive
                            ? "border-sky-500/40 bg-sky-500/10 text-white font-medium shadow-md shadow-sky-500/5"
                            : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <MessageSquare
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isActive ? "text-sky-400" : "text-slate-500"
                            }`}
                          />
                          <span className="truncate">{session.title}</span>
                        </div>

                        {/* Action buttons on hover */}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(session.id);
                              setEditingTitle(session.title);
                            }}
                            title="Rename chat"
                            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session);
                            }}
                            title="Delete chat"
                            className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Doc Info Pill */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Document:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                      {documentInfo?.originalFilename}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Search Engine:</span>
                    <span className="text-sky-400 font-medium">Smart Hybrid Search</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Center Messages Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-[#0b0f17]">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Empty State / Suggested Questions as Starter Chips */}
              {messages.length === 0 && (
                <div className="my-10 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/5">
                    <Sparkles className="h-7 w-7" />
                  </div>

                  <h2 className="text-xl font-semibold text-white">
                    Smart Document Assistant
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                    Ask any question about your document. NexCorpus analyzes all sections and delivers verified answers with exact page citations.
                  </p>

                  <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Suggested Questions
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                      {SUGGESTED_PROMPTS.map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(promptText)}
                          disabled={isLoading || isIndexing}
                          className="group flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs text-slate-300 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-white disabled:opacity-50"
                        >
                          <span className="text-sky-400 font-bold shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">
                            →
                          </span>
                          <span className="leading-relaxed">"{promptText}"</span>
                        </button>
                      ))}
                    </div>
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

                      <span>{formatMessageTime(message.timestamp)}</span>
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
                    <div className="shrink-0 flex items-center justify-center">
                      <UserAvatar
                        image={currentUser?.image}
                        email={currentUser?.email}
                        name={currentUser?.name}
                        username={currentUser?.username || username}
                        size="sm"
                        className="border border-sky-500/40 shadow-md shadow-sky-500/10"
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Gemini / ChatGPT Style Smart Follow-Up Prompts */}
              {!isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" &&
                messages[messages.length - 1].content.length > 0 && (
                  <div className="ml-13 pl-1 sm:pl-13 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      <span>Suggested follow-ups</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getFollowUpPrompts(messages).map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isLoading || isIndexing}
                          className="group inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/5 px-3.5 py-1.5 text-xs text-slate-300 transition hover:border-sky-500/50 hover:bg-sky-500/15 hover:text-white disabled:opacity-50"
                        >
                          <span className="text-sky-400 font-bold group-hover:translate-x-0.5 transition-transform text-[11px]">
                            ✦
                          </span>
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Loading State Indicator */}
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
