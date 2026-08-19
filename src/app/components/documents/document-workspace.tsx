"use client";

import { useEffect, useState } from "react";
import DocumentList from "./document-list";
import UserProfileModal from "@/app/components/auth/user-profile-modal";
import { UploadCloud, FileText, Sparkles, ShieldCheck, Search, User, RefreshCw, Loader2 } from "lucide-react";

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
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgressStep, setUploadProgressStep] = useState(0);
  const [error, setError] = useState("");

  async function loadDocuments() {
    try {
      setIsLoadingDocuments(true);
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
    } finally {
      setIsLoadingDocuments(false);
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
       * STEP 1: Create Document Record
       */
      setUploadMessage("Reading document details...");

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
        throw new Error(createData.error ?? "Unable to start file upload");
      }

      const documentId = createData.document.id;

      /*
       * STEP 2: Obtain Secure Upload Link
       */
      setUploadProgressStep(2);
      setUploadMessage("Preparing secure upload link...");

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
          presignedData.error ?? "Unable to prepare upload"
        );
      }

      /*
       * STEP 3: Upload Directly to Storage
       */
      setUploadProgressStep(3);
      setUploadMessage("Saving document securely...");

      const s3Response = await fetch(presignedData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!s3Response.ok) {
        throw new Error("Secure upload failed. Please try again.");
      }

      /*
       * STEP 4: Complete Upload & Auto Indexing
       */
      setUploadProgressStep(4);
      setUploadMessage("Analyzing document text & building search index...");

      const completeResponse = await fetch(
        `/api/documents/${documentId}/upload/complete`,
        { method: "POST" }
      );

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(
          completeData.error ?? "Unable to process uploaded file"
        );
      }

      setUploadProgressStep(5);
      setUploadMessage("Upload complete! Document is ready to answer questions.");

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
    } finally {
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
                Smart Document Assistant
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

            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5 text-xs text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
            >
              <User className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-medium">@{username}</span>
            </button>
          </div>
        </div>
      </header>

      {/* User Profile Popup Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={{ username }}
      />

      {/* Main Workspace Container */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Banner Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-[#0f172a] to-sky-950/40 p-8 shadow-2xl">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Intelligence Active</span>
            </span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Smart Document Workspace
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Upload any PDF, document, resume, or report. NexCorpus automatically reads your files,
              understands their structure, and lets you ask questions with verified source answers.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Secure Private Cloud</span>
            </div>

            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-sky-400" />
              <span>Smart Search Engine</span>
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
                {isUploading ? "Processing Document..." : "Upload Your Document"}
              </h2>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {isUploading
                  ? uploadMessage
                  : "Drag and drop your PDF or document here, or choose a file from your device."}
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

                  <p className="text-[11px] font-medium text-sky-400">
                    Step {uploadProgressStep} of 4 — {uploadMessage}
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
                Your Uploaded Documents
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any document to start asking questions or generating summaries
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              {documents.length} {documents.length === 1 ? "document" : "documents"}
            </span>
          </div>

          <DocumentList documents={documents} isLoading={isLoadingDocuments} />
        </section>
      </div>
    </main>
  );
}