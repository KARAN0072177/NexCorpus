"use client";

import { useEffect, useState } from "react";
import DocumentList from "./document-list";
import { UploadCloud, FileText, Sparkles, CheckCircle2, ShieldCheck, Database, User, RefreshCw } from "lucide-react";

interface DocumentWorkspaceProps {
  username: string;
}

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

export default function DocumentWorkspace({
  username,
}: DocumentWorkspaceProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgressStep, setUploadProgressStep] = useState(0);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      const response = await fetch("/api/documents", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load documents");
      }

      setDocuments(data.documents ?? []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      setError("Unable to load your documents.");
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadFile(file: File) {
    setError("");
    setUploadMessage("");
    setIsUploading(true);
    setUploadProgressStep(1);

    try {
      /*
       * STEP 1: Create MongoDB Document Record
       */
      setUploadMessage("Initializing document metadata record...");

      const createResponse = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalFilename: file.name,
          mimeType: file.type,
          extension: getExtension(file.name),
          size: file.size,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error ?? "Unable to create document");
      }

      const documentId = createData.document.id;

      /*
       * STEP 2: Obtain Presigned S3 Upload URL
       */
      setUploadProgressStep(2);
      setUploadMessage("Generating secure private S3 presigned URL...");

      const presignedResponse = await fetch(
        `/api/documents/${documentId}/upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type }),
        }
      );

      const presignedData = await presignedResponse.json();

      if (!presignedResponse.ok) {
        throw new Error(
          presignedData.error ?? "Unable to prepare file upload"
        );
      }

      /*
       * STEP 3: Upload Directly to S3 Storage
       */
      setUploadProgressStep(3);
      setUploadMessage("Uploading document payload directly to AWS S3...");

      const s3Response = await fetch(presignedData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error("S3 upload failed");
      }

      /*
       * STEP 4: Complete Upload & Trigger Processing Pipeline
       */
      setUploadProgressStep(4);
      setUploadMessage("Verifying storage & triggering chunk indexing pipeline...");

      const completeResponse = await fetch(
        `/api/documents/${documentId}/upload/complete`,
        { method: "POST" }
      );

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(
          completeData.error ?? "Unable to verify uploaded file"
        );
      }

      setUploadProgressStep(5);
      setUploadMessage("Upload complete! Document indexed and ready for Q&A.");

      await loadDocuments();

      setTimeout(() => {
        setUploadMessage("");
        setUploadProgressStep(0);
      }, 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      setError(
        error instanceof Error ? error.message : "Upload failed."
      );
      setUploadProgressStep(0);
    } fontally: {
      setIsUploading(false);
    }
  }

  function getExtension(filename: string) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) return "";
    return filename.slice(lastDot).toLowerCase();
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isUploading) setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) return;

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    event.target.value = "";
  }

  return (
    <main className="min-h-screen bg-[#0b0f17] text-white">
      {/* Header Bar */}
      <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-base font-bold tracking-tight text-white">
                NexCorpus
              </p>
              <p className="text-[11px] text-slate-400">
                Conversational Document Knowledge Base & RAG V1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDocuments}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-xs text-slate-300">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>@{username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Banner Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-[#0f172a] to-sky-950/40 p-8 shadow-2xl">
          <div>
            <span className="inline-block rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
              RAG V1 Pipeline Active
            </span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Document Knowledge Base
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Upload PDF documents, resumes, or engineering specifications. NexCorpus chunks,
              indexes embeddings into MongoDB Atlas, and provides strictly grounded conversational Q&A.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Private S3 Storage</span>
            </div>

            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-400" />
              <span>Atlas Vector Search</span>
            </div>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <section>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              "relative overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center transition-all shadow-xl",
              isDragging
                ? "border-sky-400 bg-sky-500/10 scale-[1.01]"
                : "border-white/15 bg-slate-900/40 hover:border-white/30",
              isUploading ? "cursor-wait opacity-80" : "",
            ].join(" ")}
          >
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-400 shadow-lg shadow-sky-500/5">
                <UploadCloud className="h-7 w-7" />
              </div>

              <h2 className="text-lg font-semibold text-white">
                {isUploading ? "Uploading & Processing Document" : "Upload Document to Corpus"}
              </h2>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {isUploading
                  ? uploadMessage
                  : "Drag and drop your PDF or document here, or browse files from your computer."}
              </p>

              {/* Upload Stepper Progress */}
              {isUploading && (
                <div className="mt-6 space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${uploadProgressStep * 20}%` }}
                    />
                  </div>

                  <p className="text-[11px] font-mono text-sky-400">
                    Step {uploadProgressStep} of 5
                  </p>
                </div>
              )}

              {!isUploading && (
                <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 shadow-lg shadow-sky-500/20">
                  <FileText className="h-4 w-4" />
                  <span>Choose Document File</span>

                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    accept=".pdf,.txt,.doc,.docx"
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}
        </section>

        {/* Documents Collection Grid */}
        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Your Documents
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a document to open conversational chat Q&A
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </span>
          </div>

          <DocumentList documents={documents} />
        </section>
      </div>
    </main>
  );
}