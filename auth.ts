import "@/lib/dns";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
} from "@/features/auth/services/user.service";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: SEVEN_DAYS_SECONDS,
    updateAge: 24 * 60 * 60, // refresh daily
  },

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
        let hasChanges = false;
        if (user.image && existingUser.image !== user.image) {
          existingUser.image = user.image;
          hasChanges = true;
        }
        if (user.name && existingUser.name !== user.name) {
          existingUser.name = user.name;
          hasChanges = true;
        }
        if (hasChanges) {
          await existingUser.save();
        }
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

    async jwt({ token, user }) {
      if (user) {
        if (user.image) token.picture = user.image;
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email;
      }

      if (token.email) {
        const dbUser = await findUserByEmail(token.email);

        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.username = dbUser.username ?? null;
          token.email = dbUser.email;
          if (dbUser.image) token.picture = dbUser.image;
          if (dbUser.name) token.name = dbUser.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.userId) session.user.id = token.userId as string;
        if (token.username) session.user.username = token.username as string;
        if (token.email) session.user.email = token.email as string;
        if (token.picture) session.user.image = token.picture as string;
        if (token.name) session.user.name = token.name as string;
      }

      return session;
    },
  },
});