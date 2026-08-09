"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function UsernameForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to set username.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Username setup failed:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Username
        </label>

        <div className="flex items-center rounded-xl border border-white/10 bg-black/30 px-4 transition focus-within:border-white/30">
          <span className="mr-2 text-white/30">@</span>

          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="karan"
            autoComplete="username"
            maxLength={30}
            disabled={loading}
            className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/20 disabled:cursor-not-allowed"
          />
        </div>

        <p className="mt-2 text-xs text-white/30">
          3–30 characters. Letters, numbers, and underscores only.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !username.trim()}
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Setting username..." : "Continue"}
      </button>
    </form>
  );
}