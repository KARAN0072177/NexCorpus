import { redirect } from "next/navigation";

import { auth } from "../../../auth";
import LoginButton from "./login-button";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    if (session.user.username) {
      redirect("/");
    }

    redirect("/set-username");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-white/40">
              NexCorpus
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/50">
              Sign in to access your knowledge workspace.
            </p>
          </div>

          <LoginButton />

          <p className="mt-6 text-center text-xs leading-5 text-white/30">
            By continuing, you agree to use NexCorpus responsibly.
          </p>
        </div>
      </div>
    </main>
  );
}