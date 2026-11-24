import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import { isAllowedEmail } from "@/lib/env";

export async function getAllowedSession() {
  const session = await getServerSession(authOptions);
  return isAllowedEmail(session?.user?.email) ? session : null;
}

export async function requirePageSession() {
  const session = await getAllowedSession();
  if (!session) redirect("/login");
  return session;
}
