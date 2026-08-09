"use client";

import { useState } from "react";
import DocumentList from "./document-list";

interface DocumentWorkspaceProps {
  username: string;
}

export default function DocumentWorkspace({
  username,
}: DocumentWorkspaceProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);

    console.log("Dropped files:", files);
  }

  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);

    console.log("Selected files:", files);
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
            Upload documents and build your searchable knowledge base.
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
            ].join(" ")}
          >
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <span className="text-xl">↑</span>
              </div>

              <h2 className="text-lg font-medium">
                Upload a document
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/40">
                Drag and drop a file here, or choose one from your
                computer.
              </p>

              <label className="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90">
                Choose file

                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>

              <p className="mt-4 text-xs text-white/25">
                File upload will be connected to S3 in the next
                step.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Documents
            </h2>

            <span className="text-xs text-white/30">
              0 documents
            </span>
          </div>

          <DocumentList />
        </section>
      </div>
    </main>
  );
}