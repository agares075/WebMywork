import { NextResponse, type NextRequest } from "next/server";
import { getAllowedSession } from "@/lib/auth/session";
import { getEnvironment } from "@/lib/env";
import { initializeSpreadsheet } from "@/lib/sheets/initialize";
import { connectionFailure } from "@/lib/sheets/errors";
import { t } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  const noStore = { "Cache-Control": "no-store" };
  if (!await getAllowedSession()) {
    return NextResponse.json({ ok: false, message: t.errors.unauthorized, reconnect: true }, { status: 401, headers: noStore });
  }
  if (request.headers.get("origin") !== new URL(getEnvironment().NEXTAUTH_URL).origin) {
    return NextResponse.json({ ok: false, message: t.errors.forbidden, reconnect: false }, { status: 403, headers: noStore });
  }
  try {
    const connection = await initializeSpreadsheet();
    return NextResponse.json({ ok: true, connection }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(connectionFailure(error), { status: 502, headers: noStore });
  }
}
