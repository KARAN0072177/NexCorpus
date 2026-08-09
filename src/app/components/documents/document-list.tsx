import DocumentCard from "./document-card";

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
}

export default function DocumentList({
  documents,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm text-white/50">
          No documents yet.
        </p>

        <p className="mt-2 text-xs text-white/25">
          Upload your first document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
        />
      ))}
    </div>
  );
}