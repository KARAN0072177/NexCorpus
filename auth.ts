import "@/lib/dns";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
} from "@/features/auth/services/user.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      if (!account.providerAccountId || !user.email) {
        return false;
      }

      const googleId = account.providerAccountId;

      const existingUser = await findUserByGoogleId(googleId);

      if (existingUser) {
        return true;
      }

      const existingEmailUser = await findUserByEmail(user.email);

      if (existingEmailUser) {
        console.error(
          "Google identity conflict: email already belongs to another NexCorpus user."
        );

        return false;
      }

      await createUser({
        googleId,
        email: user.email,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
      });

      return true;
    },

    async jwt({ token }) {
      if (token.email && !token.userId) {
        const user = await findUserByEmail(token.email);

        if (user) {
          token.userId = user._id.toString();
          token.username = user.username ?? null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
        session.user.username = token.username ?? null;
      }

      return session;
    },
  },
});