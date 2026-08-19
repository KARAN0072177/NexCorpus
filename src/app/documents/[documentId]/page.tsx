import { requireUser } from "@/lib/auth/require-user";
import DocumentChatWorkspace from "@/app/components/chat/document-chat-workspace";

interface DocumentChatPageProps {
  params: Promise<{
    documentId: string;
  }>;
}

export default async function DocumentChatPage({
  params,
}: DocumentChatPageProps) {
  const user = await requireUser();
  const { documentId } = await params;

  return (
    <DocumentChatWorkspace
      documentId={documentId}
      username={user.username ?? "user"}
      user={{
        id: user._id.toString(),
        username: user.username ?? "user",
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      }}
    />
  );
}
