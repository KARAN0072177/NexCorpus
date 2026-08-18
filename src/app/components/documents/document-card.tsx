import Link from "next/link";
import { MessageSquare, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";

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

function getDocumentStatus(document: DocumentItem) {
  if (document.storageStatus === "PENDING") {
    return { label: "Uploading", isReady: false };
  }

  if (document.storageStatus === "FAILED") {
    return { label: "Upload failed", isReady: false };
  }

  if (document.securityStatus === "REJECTED") {
    return { label: "Rejected", isReady: false };
  }

  if (document.securityStatus === "SCANNING") {
    return { label: "Security scanning", isReady: false };
  }

  if (document.processingStatus === "PROCESSING") {
    return { label: "Processing chunks", isReady: false };
  }

  if (document.processingStatus === "FAILED") {
    return { label: "Processing failed", isReady: false };
  }

  if (document.indexingStatus === "PROCESSING") {
    return { label: "Atlas indexing", isReady: false };
  }

  if (document.indexingStatus === "FAILED") {
    return { label: "Indexing failed", isReady: false };
  }

  if (
    document.storageStatus === "UPLOADED" &&
    document.securityStatus === "APPROVED" &&
    document.processingStatus === "COMPLETED" &&
    document.indexingStatus === "COMPLETED"
  ) {
    return { label: "Ready to Chat", isReady: true };
  }

  return { label: "Uploaded", isReady: false };
}

export default function DocumentCard({
  document,
}: DocumentCardProps) {
  const { label, isReady } = getDocumentStatus(document);

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-5 transition hover:border-sky-500/30 hover:bg-slate-900/80 hover:shadow-2xl">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-xs font-bold uppercase text-sky-400">
          {document.extension.replace(".", "") || "FILE"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-medium text-white group-hover:text-sky-300">
            {document.originalFilename}
          </p>

          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
            <span>{formatBytes(document.size)}</span>
            <span>•</span>
            <span>{document.mimeType}</span>
            <span>•</span>
            <span>ID: {document.id.slice(-6)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isReady
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {isReady ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-amber-400" />
          )}
          {label}
        </span>

        <Link
          href={`/documents/${document.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:bg-sky-500 hover:text-white"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Chat / Ask</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}