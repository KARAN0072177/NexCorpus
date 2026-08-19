"use client";

import { useEffect, useRef, useState } from "react";
import { X, Pencil, Loader2, AlertCircle, Lock } from "lucide-react";

interface DocumentRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentFilename: string;
  onRenamed: (documentId: string, newFilename: string) => void;
}

function parseFilename(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0) {
    return {
      baseName: filename.slice(0, lastDot),
      extension: filename.slice(lastDot),
    };
  }
  return {
    baseName: filename,
    extension: "",
  };
}

export default function DocumentRenameModal({
  isOpen,
  onClose,
  documentId,
  currentFilename,
  onRenamed,
}: DocumentRenameModalProps) {
  const { baseName: initialBaseName, extension } = parseFilename(currentFilename);
  const [baseName, setBaseName] = useState(initialBaseName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseFilename(currentFilename);
      setBaseName(parsed.baseName);
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentFilename]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedBase = baseName.trim();

    if (!trimmedBase) {
      setError("Document name cannot be empty");
      return;
    }

    const finalFilename = `${trimmedBase}${extension}`;

    if (finalFilename === currentFilename.trim()) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: finalFilename }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to rename document");
      }

      onRenamed(documentId, data.document.originalFilename);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while renaming");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 via-[#0d1322] to-[#0a0e17] p-6 text-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Rename Document</h3>
            <p className="text-xs text-slate-400">
              Update the display name of this document
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Document Name
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-xl border border-white/15 bg-slate-950/80 pl-4 pr-16 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
                placeholder="Enter document name..."
              />
              {extension && (
                <div
                  title="File extension is locked"
                  className="absolute right-2.5 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-slate-400 select-none"
                >
                  <Lock className="h-3 w-3 text-slate-400" />
                  <span>{extension}</span>
                </div>
              )}
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="h-3 w-3 text-slate-400" />
              <span>File extension ({extension || "original"}) is locked to protect RAG indexing.</span>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !baseName.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
