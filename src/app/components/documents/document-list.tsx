import DocumentCard from "./document-card";
import DocumentCardSkeleton from "./document-card-skeleton";

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

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading?: boolean;
}

export default function DocumentList({
  documents,
  isLoading = false,
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <DocumentCardSkeleton />
        <DocumentCardSkeleton />
        <DocumentCardSkeleton />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400">
        <p className="text-sm font-medium text-slate-300">No documents uploaded yet.</p>
        <p className="mt-1 text-xs text-slate-400">
          Upload a PDF or document above to start indexing and asking questions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
        />
      ))}
    </div>
  );
}