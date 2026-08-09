import { auth } from "../../../auth";
import { findUserById } from "@/features/auth/services/user.service";

export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await findUserById(session.user.id);

  return user;
}