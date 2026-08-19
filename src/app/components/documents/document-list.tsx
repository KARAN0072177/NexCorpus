import DocumentCard, { DocumentItem } from "./document-card";
import DocumentCardSkeleton from "./document-card-skeleton";

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading?: boolean;
  onRename?: (documentId: string, newFilename: string) => void;
  onDelete?: (documentId: string) => void;
}

export default function DocumentList({
  documents,
  isLoading = false,
  onRename,
  onDelete,
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
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}