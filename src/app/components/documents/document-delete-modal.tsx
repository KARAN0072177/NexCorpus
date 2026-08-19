"use client";

import { useState } from "react";
import { X, Trash2, Loader2, AlertTriangle, AlertCircle } from "lucide-react";

interface DocumentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  filename: string;
  onDeleted: (documentId: string) => void;
}

export default function DocumentDeleteModal({
  isOpen,
  onClose,
  documentId,
  filename,
  onDeleted,
}: DocumentDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleDelete() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete document");
      }

      onDeleted(documentId);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while deleting");
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-b from-slate-900 via-[#140e14] to-[#0d070b] p-6 text-white shadow-2xl">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Delete Document</h3>
            <p className="text-xs text-slate-400">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Warning Body */}
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <strong className="text-white font-mono">{filename}</strong>?
                This will remove the file from secure storage, delete all vector search embeddings, and purge search indexes.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-500 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Document</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
