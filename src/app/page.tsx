import { requireUser } from "@/lib/auth/require-user";
import DocumentWorkspace from "./components/documents/document-workspace";

export default async function HomePage() {
  const user = await requireUser();

  return (
    <DocumentWorkspace
      username={user.username ?? "user"}
    />
  );
}