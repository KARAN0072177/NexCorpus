"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  X,
  AlertTriangle,
  Trash2,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  username?: string | null;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userEmail,
  username,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const CONFIRM_PHRASE = "delete my account";
  const isConfirmValid = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  async function handleVerifyGoogle() {
    setIsVerifying(true);
    setError(null);

    try {
      // Verify active session with /api/auth/me
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        throw new Error("Unable to verify active session. Please sign in again.");
      }

      // Successful verification -> proceed to final destructive confirmation
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handlePermanentDelete() {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Complete session logout and redirect to login
      await signOut({ callbackUrl: "/login" });
    } catch (err: any) {
      setError(err.message || "An error occurred during account deletion.");
      setIsDeleting(false);
    }
  }

  function handleClose() {
    if (isDeleting) return;
    setStep(1);
    setConfirmText("");
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-b from-slate-900 via-[#180d12] to-[#0d070a] p-6 text-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isDeleting}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-rose-500/20">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                Danger Zone
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Step {step} of 2
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              {step === 1 ? "Verify Google Identity" : "Confirm Account Deletion"}
            </h3>
          </div>
        </div>

        {/* STEP 1: Google Identity Verification */}
        {step === 1 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300 space-y-2">
              <p className="leading-relaxed">
                To protect your data and prevent accidental loss, please verify your Google account before deleting your profile.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-slate-200">
                <span className="text-slate-400">Account:</span>
                <span className="font-semibold text-sky-400">
                  {userEmail || `@${username || "user"}`}
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleVerifyGoogle}
                disabled={isVerifying}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 text-xs font-semibold text-slate-900 shadow-md transition hover:bg-slate-100 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                    <span>Verifying Google identity...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-4 w-4" />
                    <span>Verify with Google Account</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto text-slate-400" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isVerifying}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                Cancel & Return
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Irreversible Deletion Warning & Confirmation */}
        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span>This action is permanent and cannot be undone!</span>
              </div>

              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-rose-200/90 leading-relaxed">
                <li>All uploaded PDFs and documents will be deleted from AWS S3.</li>
                <li>All vector search embeddings and chunks will be purged.</li>
                <li>Your username, profile, and account records will be wiped.</li>
                <li>Next time you log in, a completely blank new account will be created.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Type <strong className="text-rose-400 font-mono">{CONFIRM_PHRASE}</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                placeholder={CONFIRM_PHRASE}
                className="w-full rounded-xl border border-rose-500/30 bg-slate-950/90 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Keep My Account
              </button>

              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={!isConfirmValid || isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Wiping all data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}
