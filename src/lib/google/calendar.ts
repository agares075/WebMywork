import "server-only";
import { createHash } from "node:crypto";
import { getGoogleAuth } from "./client";
import { addDays } from "@/lib/calculations";
import type { Job } from "@/types/job";

const baseUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
type EventBody = { summary: string; description: string; location?: string; start: { dateTime?: string; date?: string; timeZone?: string }; end: { dateTime?: string; date?: string; timeZone?: string }; extendedProperties: { private: { dailyWorkLogId: string } }; status: "confirmed" };
function status(error: unknown) { return (error as { response?: { status?: number } } | null)?.response?.status; }

export async function syncJobCalendar(job: Job, deleting = false, onPlan?: (planned: Job) => Promise<void>): Promise<Job> {
  let planned = job;
  const auth = await getGoogleAuth();
  async function remove(id: string) {
    if (!id) return;
    try { await auth.request({ url: `${baseUrl}/${encodeURIComponent(id)}`, method: "DELETE" }); }
    catch (error) { if (![404, 410].includes(status(error) ?? 0)) throw error; }
  }
  async function upsert(id: string, body: EventBody, field: "calendarEventId" | "reminderEventId", recovery = false): Promise<string> {
    try {
      await auth.request({ url: `${baseUrl}/${encodeURIComponent(id)}`, method: "PUT", data: body });
      return id;
    } catch (error) {
      if (![404, 410].includes(status(error) ?? 0)) throw error;
    }
    try {
      await auth.request({ url: baseUrl, method: "POST", data: { ...body, id } });
      return id;
    } catch (error) {
      if (status(error) !== 409 || recovery) throw error;
      // A deleted event ID may remain reserved. The recovery ID is deterministic
      // so retrying a request after a network timeout never duplicates an event.
      const replacement = createHash("sha256").update(`${id}:${job.updatedAt}`).digest("hex");
      planned = { ...planned, [field]: replacement };
      await onPlan?.(planned);
      return upsert(replacement, body, field, true);
    }
  }
  if (deleting) {
    await remove(job.calendarEventId);
    await remove(job.reminderEventId);
    return job;
  }
  const common = { description: job.details, extendedProperties: { private: { dailyWorkLogId: job.id } }, status: "confirmed" as const };
  const endDate = job.endTime <= job.startTime ? addDays(job.workDate, 1) : job.workDate;
  const calendarEventId = await upsert(job.calendarEventId, {
    ...common, summary: job.client, location: job.location,
    start: { dateTime: `${job.workDate}T${job.startTime}:00+07:00`, timeZone: "Asia/Bangkok" },
    end: { dateTime: `${endDate}T${job.endTime}:00+07:00`, timeZone: "Asia/Bangkok" }
  }, "calendarEventId");
  let reminderEventId = job.reminderEventId;
  if (job.reminderEnabled) {
    reminderEventId = await upsert(reminderEventId || `d2${job.id.replaceAll("-", "")}`, {
      ...common, summary: `กำหนดรับเงิน: ${job.client}`, start: { date: job.expectedPaymentDate }, end: { date: addDays(job.expectedPaymentDate, 1) }
    }, "reminderEventId");
  } else {
    await remove(reminderEventId);
    reminderEventId = "";
  }
  return { ...job, calendarEventId, reminderEventId, syncStatus: "synced" };
}
