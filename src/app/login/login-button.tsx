"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError(null);

      await signIn("google", {
        callbackUrl: "/",
      });
    } catch {
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        id="google-signin-btn"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="group relative flex w-full items-center gap-3 rounded-lg border border-[#e2e4e9] bg-white px-4 py-2.5 text-sm font-medium text-[#0d0d0d] shadow-sm transition-all duration-150 hover:bg-[#f5f5f5] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#666]" />
            <span className="text-[#444]">Signing you in…</span>
          </>
        ) : (
          <>
            {/* Official Google SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="h-5 w-5 shrink-0"
              aria-hidden="true"
            >
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5L31.9 33c-2 1.5-4.6 2-7.9 2-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.6 39.4 16.4 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1-.1 5.7 4.7c-.4.4 6.9-5.1 6.9-14.1 0-1.3-.1-2.6-.4-3.9z" />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}