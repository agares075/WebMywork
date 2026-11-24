import "server-only";
import { auth as googleAuth, sheets } from "@googleapis/sheets";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getEnvironment, isAllowedEmail } from "@/lib/env";
import { ConnectionError } from "@/lib/sheets/errors";
import { t } from "@/lib/i18n";

export async function getGoogleAuth() {
  const env = getEnvironment();
  const request = new NextRequest(env.NEXTAUTH_URL, { headers: await headers() });
  const token = await getToken({ req: request, secret: env.NEXTAUTH_SECRET });
  if (!token || !isAllowedEmail(token.email) || !token.googleRefreshToken) {
    throw new ConnectionError(t.errors.expired, true);
  }
  const auth = new googleAuth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({
    access_token: token.googleAccessToken,
    refresh_token: token.googleRefreshToken,
    expiry_date: token.googleExpiresAt ? token.googleExpiresAt * 1000 : 0
  });
  // The Google client refreshes expired access tokens on the server as needed.
  return auth;
}

export async function getSheetsClient() {
  return sheets({ version: "v4", auth: await getGoogleAuth() });
}
