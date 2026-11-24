import "server-only";
import { t } from "@/lib/i18n";
import type { ConnectionResult } from "@/types/sheets";

export class ConnectionError extends Error {
  constructor(message: string, readonly reconnect = false) {
    super(message);
    this.name = "ConnectionError";
  }
}

export function connectionFailure(error: unknown): Extract<ConnectionResult, { ok: false }> {
  if (error instanceof ConnectionError) {
    return { ok: false, message: error.message, reconnect: error.reconnect };
  }
  const response = (error as { response?: { status?: number; data?: { error?: unknown } } } | null)?.response;
  const status = response?.status;
  if (status === 401 || response?.data?.error === "invalid_grant") {
    return { ok: false, message: t.errors.expired, reconnect: true };
  }
  const message = status === 403 ? t.errors.permission : status === 404 ? t.errors.missingSheet :
    status === 429 ? t.errors.rateLimit : t.errors.connection;
  return { ok: false, message, reconnect: false };
}
