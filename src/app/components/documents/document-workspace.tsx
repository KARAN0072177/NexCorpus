"use client";

import { useEffect, useState } from "react";
import DocumentList from "./document-list";
import UserProfileModal, { UserProfileData } from "@/app/components/auth/user-profile-modal";
import UserAvatar from "@/app/components/auth/user-avatar";
import { UploadCloud, FileText, Sparkles, ShieldCheck, Search, User, RefreshCw, Loader2 } from "lucide-react";

interface DocumentWorkspaceProps {
  username: string;
  user?: UserProfileData;
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
  user,
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

  function handleRenameDocument(documentId: string, newFilename: string) {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === documentId ? { ...doc, originalFilename: newFilename } : doc
      )
    );
  }

  function handleDeleteDocument(documentId: string) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  }

  async function uploadFile(file: File) {
    setError("");
    setUploadMessage("");
    setIsUploading(true);
    setUploadProgressStep(1);

    try {
      setUploadMessage("Initiating secure upload...");
      const initResponse = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/pdf",
          size: file.size,
        }),
      });

      const initData = await initResponse.json();

      if (!initResponse.ok) {
        throw new Error(initData.error ?? "Upload initialization failed");
      }

      const { uploadUrl, documentId } = initData.data;

      setUploadProgressStep(2);
      setUploadMessage("Uploading file to secure storage...");
      const s3UploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });

      if (!s3UploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploadProgressStep(3);
      setUploadMessage("Scanning file safety and verifying content...");
      const completeResponse = await fetch(
        `/api/documents/${documentId}/upload/complete`,
        { method: "POST" }
      );

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(completeData.error ?? "Upload completion failed");
      }

      setUploadProgressStep(4);
      setUploadMessage("Document uploaded successfully! Analyzing content...");
      await loadDocuments();

      setTimeout(() => {
        setIsUploading(false);
        setUploadMessage("");
        setUploadProgressStep(0);
      }, 2000);
    } catch (error: any) {
      console.error("Upload process failed:", error);
      setError(error.message ?? "An error occurred during upload");
      setIsUploading(false);
      setUploadProgressStep(0);
    }
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
    <main className="min-h-screen bg-[#070a11] text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
      {/* Top Application Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070a11]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
              <FileText className="h-5 w-5 text-white" />
            </div>

            <div>
              <span className="text-base font-bold tracking-tight text-white">
                NexCorpus
              </span>
              <p className="text-[11px] font-medium text-slate-400">
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
              className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 py-1 pl-1.5 pr-3 text-xs text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20"
            >
              <UserAvatar
                image={user?.image}
                email={user?.email}
                name={user?.name}
                username={username}
                size="xs"
              />
              <span className="font-medium">@{username}</span>
            </button>
          </div>
        </div>
      </header>

      {/* User Profile Popup Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user ?? { username }}
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

          <DocumentList
            documents={documents}
            isLoading={isLoadingDocuments}
            onRename={handleRenameDocument}
            onDelete={handleDeleteDocument}
          />
        </section>
      </div>
    </main>
  );
}