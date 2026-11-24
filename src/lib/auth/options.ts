import "server-only";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { isAllowedEmail } from "@/lib/env";

const profileSchema = z.object({ email: z.email(), email_verified: z.literal(true) });

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
        access_type: "offline",
        prompt: "consent select_account"
      }
    }
  })],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      const result = profileSchema.safeParse(profile);
      return account?.provider === "google" && result.success &&
        isAllowedEmail(result.data.email) && Boolean(account.access_token && account.refresh_token);
    },
    async jwt({ token, account }) {
      if (account?.provider === "google") {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
        token.googleExpiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // OAuth credentials remain inside the encrypted HttpOnly session cookie.
      // Never copy them into the session returned to the browser.
      return {
        expires: session.expires,
        user: { name: token.name, email: token.email, image: token.picture }
      };
    }
  }
};
