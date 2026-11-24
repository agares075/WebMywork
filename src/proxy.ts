import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = process.env.NEXTAUTH_SECRET ? await getToken({
    req: request, secret: process.env.NEXTAUTH_SECRET
  }) : null;
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  if (allowed && token?.email?.toLowerCase() === allowed) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

// Login, OAuth/CSRF endpoints and static Next assets must remain public.
export const config = {
  matcher: ["/((?!api/auth(?:/|$)|login(?:/|$)|_next(?:/|$)|favicon.ico$).*)"]
};
