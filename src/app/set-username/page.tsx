import { redirect } from "next/navigation";

import { auth } from "../../../auth";
import UsernameForm from "./username-form";

export default async function SetUsernamePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.username) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur">
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-white/40">
              NexCorpus
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Choose your username
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/50">
              This will be your identity inside NexCorpus.
            </p>
          </div>

          <UsernameForm />
        </div>
      </div>
    </main>
  );
}