import { redirect } from "next/navigation";

import { auth } from "../../auth";
import { findUserById } from "@/features/auth/services/user.service";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await findUserById(session.user.id);

  if (!user) {
    redirect("/login");
  }

  if (!user.username) {
    redirect("/set-username");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-white/40">
          NexCorpus
        </p>

        <h1 className="mt-3 text-4xl font-semibold text-white">
          Welcome, @{user.username}
        </h1>

        <p className="mt-3 text-white/50">
          Your knowledge workspace starts here.
        </p>
      </div>
    </main>
  );
}