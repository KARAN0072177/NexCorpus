import DocumentCard from "./document-card";

export default function DocumentList() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <DocumentCard
        filename="No documents yet"
        extension=""
        status="Upload your first document to get started."
      />
    </div>
  );
}