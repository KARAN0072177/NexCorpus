"use client";

import { useEffect, useState } from "react";

import DocumentList from "./document-list";

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

    try {
      /*
       * STEP 1
       * Create the MongoDB document.
       */

      setUploadMessage("Creating document...");

      const createResponse = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalFilename: file.name,
          mimeType: file.type,
          extension: getExtension(file.name),
          size: file.size,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          createData.error ?? "Unable to create document"
        );
      }

      const documentId = createData.document.id;

      /*
       * STEP 2
       * Ask NexCorpus for a presigned S3 upload URL.
       */

      setUploadMessage("Preparing secure upload...");

      const presignedResponse = await fetch(
        `/api/documents/${documentId}/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentType: file.type,
          }),
        }
      );

      const presignedData = await presignedResponse.json();

      if (!presignedResponse.ok) {
        throw new Error(
          presignedData.error ??
            "Unable to prepare file upload"
        );
      }

      /*
       * STEP 3
       * Upload directly from browser → private S3.
       */

      setUploadMessage("Uploading to S3...");

      const s3Response = await fetch(
        presignedData.uploadUrl,
        {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        }
      );

      if (!s3Response.ok) {
        throw new Error("S3 upload failed");
      }

      /*
       * STEP 4
       * Tell NexCorpus that the upload finished.
       * The backend verifies the object with HeadObject.
       */

      setUploadMessage("Verifying upload...");

      const completeResponse = await fetch(
        `/api/documents/${documentId}/upload/complete`,
        {
          method: "POST",
        }
      );

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        throw new Error(
          completeData.error ??
            "Unable to verify uploaded file"
        );
      }

      setUploadMessage("Upload complete.");

      await loadDocuments();

      setTimeout(() => {
        setUploadMessage("");
      }, 2000);
    } catch (error) {
      console.error("Upload failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Upload failed."
      );
    } finally {
      setIsUploading(false);
    }
  }

  function getExtension(filename: string) {
    const lastDot = filename.lastIndexOf(".");

    if (lastDot === -1) {
      return "";
    }

    return filename.slice(lastDot).toLowerCase();
  }

  function handleDragOver(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (!isUploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setIsDragging(false);

    if (isUploading) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    await uploadFile(files[0]);
  }

  async function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);

    event.target.value = "";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <p className="text-sm font-semibold tracking-wide">
              NexCorpus
            </p>

            <p className="text-xs text-white/40">
              Engineering knowledge workspace
            </p>
          </div>

          <div className="text-sm text-white/60">
            @{username}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your Corpus
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Upload documents and build your searchable
            knowledge base.
          </p>
        </div>

        <section>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              "rounded-2xl border border-dashed p-12 text-center transition",
              isDragging
                ? "border-white/50 bg-white/[0.06]"
                : "border-white/15 bg-white/[0.02]",
              isUploading
                ? "cursor-wait opacity-70"
                : "",
            ].join(" ")}
          >
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <span className="text-xl">↑</span>
              </div>

              <h2 className="text-lg font-medium">
                {isUploading
                  ? "Uploading document..."
                  : "Upload a document"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                {isUploading
                  ? uploadMessage
                  : "Drag and drop a file here, or choose one from your computer."}
              </p>

              {!isUploading && (
                <label className="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90">
                  Choose file

                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                </label>
              )}

              {!isUploading && (
                <p className="mt-4 text-xs text-white/25">
                  Files are uploaded directly to private
                  storage.
                </p>
              )}
            </div>
          </div>

          {uploadMessage && !isUploading && (
            <p className="mt-3 text-center text-xs text-white/40">
              {uploadMessage}
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Documents
            </h2>

            <span className="text-xs text-white/30">
              {documents.length}{" "}
              {documents.length === 1
                ? "document"
                : "documents"}
            </span>
          </div>

          <DocumentList documents={documents} />
        </section>
      </div>
    </main>
  );
}