import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import LoginButton from "./login-button";
import { FileText, MessageSquareText, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Sign In — NexCorpus",
  description: "Sign in to NexCorpus to start querying your documents with AI.",
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect(session.user.username ? "/" : "/set-username");
  }

  const testimonials = [
    {
      quote:
        "I uploaded my 80-page contract and asked 'what are the termination clauses?' — got the exact answer with page numbers in seconds.",
      name: "Legal Associate",
      role: "Law Firm",
    },
    {
      quote:
        "Replaced hours of reading technical specs with one conversation. NexCorpus finds what I need instantly.",
      name: "Senior Engineer",
      role: "Software Company",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0e12] text-white lg:flex-row">
      {/* ─── Left Panel — Brand & Social Proof ─── */}
      <div className="relative flex flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[#0c0e12] p-10 lg:w-[52%] lg:p-16">

        {/* Subtle radial accent — top right */}
        <div className="pointer-events-none absolute right-0 top-0 h-[40%] w-[60%] bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.07),transparent_70%)]" />
        {/* Subtle radial accent — bottom left */}
        <div className="pointer-events-none absolute bottom-0 left-0 h-[35%] w-[50%] bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.06),transparent_70%)]" />

        {/* Wordmark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            NexCorpus
          </span>
        </div>

        {/* Headline Block */}
        <div className="relative z-10 my-auto space-y-6 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
            Document Intelligence
          </p>

          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white">
            Every answer lives{" "}
            <br />
            inside your documents.{" "}
            <br />
            <span className="text-slate-400">We find it for you.</span>
          </h1>

          <p className="text-[15px] leading-relaxed text-slate-400">
            Upload any PDF. Ask any question. Get cited, grounded answers — not hallucinations. No training, no waiting, no setup.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-3 text-sm text-slate-400">
            {[
              "Real-time streaming responses — answers appear as they're generated",
              "Cited page & section references for every answer",
              "Smart hybrid search across your entire document",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-[3px] h-4 w-4 shrink-0 rounded-full border border-sky-500/40 bg-sky-500/10 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                </span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Social Proof */}
        <div className="relative z-10 space-y-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"
            >
              <div className="mb-2 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-3 w-3 fill-amber-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-slate-300 italic">"{t.quote}"</p>
              <p className="mt-2 text-[11px] text-slate-500 font-medium">
                — {t.name}, {t.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Panel — Auth Form ─── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 lg:px-16">
        <div className="w-full max-w-[360px] space-y-8">

          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Sign in
            </h2>
            <p className="text-sm text-slate-400">
              Use your Google account to continue to NexCorpus.
            </p>
          </div>

          {/* Divider with label */}
          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">Single sign-on</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* The Google button — clean white on dark */}
          <LoginButton />

          {/* Micro security note */}
          <div className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-[12px] leading-relaxed text-slate-400">
              Your documents are private and encrypted. NexCorpus never trains on your data. Sessions expire automatically after 7 days.
            </p>
          </div>

          {/* Footer micro-links */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <MessageSquareText className="h-3 w-3" />
              Need help? Contact support
            </span>
            <span>© 2025 NexCorpus</span>
          </div>
        </div>
      </div>
    </div>
  );
}