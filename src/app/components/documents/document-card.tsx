import Link from "next/link";
import { MessageSquare, ArrowRight, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

interface DocumentItem {
  id: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;

  storageStatus: "PENDING" | "UPLOADED" | "FAILED";

  securityStatus:
    | "PENDING"
    | "SCANNING"
    | "APPROVED"
    | "REJECTED"
    | "FAILED";

  processingStatus:
    | "NOT_STARTED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

  indexingStatus:
    | "NOT_STARTED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

  createdAt: string;
  updatedAt: string;
}

interface DocumentCardProps {
  document: DocumentItem;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFriendlyType(mimeType: string, extension: string) {
  if (mimeType.includes("pdf") || extension.includes("pdf")) {
    return "PDF Document";
  }
  if (mimeType.includes("word") || extension.includes("doc")) {
    return "Word Document";
  }
  if (mimeType.includes("text") || extension.includes("txt")) {
    return "Text File";
  }
  return "Document";
}

function getDocumentStatus(document: DocumentItem) {
  if (document.storageStatus === "PENDING") {
    return { label: "Uploading File...", isReady: false, isError: false };
  }

  if (document.storageStatus === "FAILED") {
    return { label: "Upload Failed", isReady: false, isError: true };
  }

  if (document.securityStatus === "REJECTED") {
    return { label: "Safety Check Failed", isReady: false, isError: true };
  }

  if (document.securityStatus === "SCANNING") {
    return { label: "Checking File Safety...", isReady: false, isError: false };
  }

  if (document.processingStatus === "PROCESSING") {
    return { label: "Analyzing Content...", isReady: false, isError: false };
  }

  if (document.processingStatus === "FAILED") {
    return { label: "Analysis Interrupted", isReady: false, isError: true };
  }

  if (document.indexingStatus === "PROCESSING" || document.processingStatus === "NOT_STARTED") {
    return { label: "Preparing Smart Search...", isReady: false, isError: false };
  }

  if (document.indexingStatus === "FAILED") {
    return { label: "Search Index Failed", isReady: false, isError: true };
  }

  if (
    document.storageStatus === "UPLOADED" &&
    document.securityStatus === "APPROVED" &&
    document.processingStatus === "COMPLETED" &&
    document.indexingStatus === "COMPLETED"
  ) {
    return { label: "Ready to Chat", isReady: true, isError: false };
  }

  return { label: "Uploaded", isReady: false, isError: false };
}

export default function DocumentCard({
  document,
}: DocumentCardProps) {
  const { label, isReady, isError } = getDocumentStatus(document);
  const friendlyType = formatFriendlyType(document.mimeType, document.extension);
  const formattedDate = new Date(document.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5 transition hover:border-sky-500/40 hover:bg-slate-900/80 hover:shadow-2xl">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 text-xs font-bold uppercase text-sky-400">
          {document.extension.replace(".", "") || "DOC"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white group-hover:text-sky-300">
            {document.originalFilename}
          </p>

          <div className="mt-1 flex items-center gap-2.5 text-xs text-slate-400">
            <span className="font-medium text-slate-300">{friendlyType}</span>
            <span>•</span>
            <span>{formatBytes(document.size)}</span>
            <span>•</span>
            <span>Added {formattedDate}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            isReady
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : isError
              ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {isReady ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : isError ? (
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          )}
          {label}
        </span>

        <Link
          href={`/documents/${document.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500 hover:text-white hover:shadow-lg hover:shadow-sky-500/20"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Ask Questions</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}