import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { getConfiguration } from "@/lib/env";

const handler = NextAuth(authOptions);

async function configuredHandler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!getConfiguration().success) {
    return NextResponse.json({ error: "Server configuration is incomplete" }, { status: 503 });
  }
  return handler(request, context);
}

export { configuredHandler as GET, configuredHandler as POST };
