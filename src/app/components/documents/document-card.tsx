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
    return "Uploading";
  }

  if (document.storageStatus === "FAILED") {
    return "Upload failed";
  }

  if (document.securityStatus === "REJECTED") {
    return "Rejected";
  }

  if (document.securityStatus === "SCANNING") {
    return "Security scanning";
  }

  if (document.processingStatus === "PROCESSING") {
    return "Processing";
  }

  if (document.processingStatus === "FAILED") {
    return "Processing failed";
  }

  if (document.indexingStatus === "PROCESSING") {
    return "Indexing";
  }

  if (document.indexingStatus === "FAILED") {
    return "Indexing failed";
  }

  if (
    document.storageStatus === "UPLOADED" &&
    document.securityStatus === "APPROVED" &&
    document.processingStatus === "COMPLETED" &&
    document.indexingStatus === "COMPLETED"
  ) {
    return "Ready";
  }

  return "Uploaded";
}

export default function DocumentCard({
  document,
}: DocumentCardProps) {
  const status = getDocumentStatus(document);

  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/5 px-5 py-4 last:border-b-0">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] uppercase text-white/40">
          {document.extension.replace(".", "") || "FILE"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/80">
            {document.originalFilename}
          </p>

          <p className="mt-1 text-xs text-white/30">
            {formatBytes(document.size)} ·{" "}
            {document.mimeType}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/50">
          {status}
        </span>
      </div>
    </div>
  );
}