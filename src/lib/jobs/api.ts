import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAllowedSession } from "@/lib/auth/session";
import { getEnvironment } from "@/lib/env";
import { connectionFailure } from "@/lib/sheets/errors";
import { JobError } from "./service";
import { t } from "@/lib/i18n";

export async function jobApi(request: NextRequest, action: () => Promise<unknown>, mutation = true) {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (!await getAllowedSession()) throw new JobError(401, t.errors.unauthorized);
    if (mutation && request.headers.get("origin") !== new URL(getEnvironment().NEXTAUTH_URL).origin) throw new JobError(403, t.errors.forbidden);
    const result = await action();
    return result instanceof Response ? result : NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof JobError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof z.ZodError) return NextResponse.json({ error: t.jobs.invalid }, { status: 400, headers });
    const failure = connectionFailure(error);
    return NextResponse.json({ error: failure.message, reconnect: failure.reconnect }, { status: 502, headers });
  }
}
export function jobId(value: string) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new JobError(400, t.jobs.invalid);
  return result.data;
}
export async function readBody(request: NextRequest) {
  if (Number(request.headers.get("content-length")) > 64000) throw new JobError(413, t.jobs.invalid);
  const text = await request.text();
  if (text.length > 64000) throw new JobError(413, t.jobs.invalid);
  try { return JSON.parse(text) as unknown; } catch { throw new JobError(400, t.jobs.invalid); }
}
