import "server-only";
import { z } from "zod";

const environmentSchema = z.object({
  NEXTAUTH_URL: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname));
  }, "Use HTTPS except for local development"),
  NEXTAUTH_SECRET: z.string().trim().min(32),
  GOOGLE_CLIENT_ID: z.string().trim().min(1),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
  ALLOWED_EMAIL: z.email().transform((value) => value.toLowerCase()),
  GOOGLE_SPREADSHEET_ID: z.string().trim().regex(/^[a-zA-Z0-9_-]{20,}$/)
});

export function getConfiguration() {
  return environmentSchema.safeParse({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ALLOWED_EMAIL: process.env.ALLOWED_EMAIL?.trim(),
    GOOGLE_SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID
  });
}

export function getEnvironment() {
  const result = getConfiguration();
  if (!result.success) throw new Error("Server configuration is incomplete");
  return result.data;
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const result = getConfiguration();
  return result.success && typeof email === "string" &&
    email.toLowerCase() === result.data.ALLOWED_EMAIL;
}
