"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);

      await signIn("google", {
        callbackUrl: "/",
      });
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span>Signing you in...</span>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M21.35 12.27c0-.72-.06-1.41-.18-2.07H12v3.92h5.22a4.46 4.46 0 0 1-1.94 2.93v2.45h3.14c1.84-1.69 2.93-4.18 2.93-7.23Z"
            />
            <path
              fill="#34A853"
              d="M12 21.66c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.66Z"
            />
            <path
              fill="#FBBC05"
              d="M6.54 13.75A5.85 5.85 0 0 1 6.23 12c0-.61.11-1.2.31-1.75V7.72H3.3A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.28l3.24-2.53Z"
            />
            <path
              fill="#EA4335"
              d="M12 6.22c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.2 14.63 2.34 12 2.34a9.74 9.74 0 0 0-8.7 5.38l3.24 2.53C7.31 7.94 9.46 6.22 12 6.22Z"
            />
          </svg>

          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
}