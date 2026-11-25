import type { MutationData, MutationEvent, QueuedRequest } from "@/types/offline";
import type { ContactHistory } from "@/types/contact";
import type { Job } from "@/types/job";

export const outboxEvent = "daily-work-log:outbox";
export const mutationEvent = "daily-work-log:mutation";
const key = (account: string) => `daily-work-log:${account}:outbox`;
export function snapshot(account: string | null): string {
  try { return account && typeof window !== "undefined" ? localStorage.getItem(key(account)) || "[]" : "[]"; } catch { return "[]"; }
}
export function parseQueue(raw: string): QueuedRequest[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.id === "string" && typeof entry.entity === "string" && entry.optimistic && typeof entry.optimistic === "object" && /^\/api\/(jobs|contacts)\//.test(entry.url) && ["PUT", "PATCH", "POST", "DELETE"].includes(entry.method)) : [];
  } catch { return []; }
}
export function queuedRequests(account: string | null): QueuedRequest[] { return parseQueue(snapshot(account)); }
export function subscribeOutbox(listener: () => void) {
  window.addEventListener(outboxEvent, listener); window.addEventListener("storage", listener);
  return () => { window.removeEventListener(outboxEvent, listener); window.removeEventListener("storage", listener); };
}
export function writeQueue(account: string, entries: QueuedRequest[]) {
  try { localStorage.setItem(key(account), JSON.stringify(entries)); }
  catch { throw new Error("บันทึกในอุปกรณ์ไม่สำเร็จ กรุณาเปิดหน้านี้ไว้และลองบันทึกอีกครั้ง"); }
  window.dispatchEvent(new Event(outboxEvent));
}
export function appendRequest(account: string, entry: QueuedRequest) { writeQueue(account, [...queuedRequests(account), entry]); }
export function mergeJobs(jobs: Job[], data: MutationData): Job[] {
  const updates = [...(data.jobs || []), ...(data.job ? [data.job] : [])];
  const ids = new Set(jobs.map((job) => job.id));
  return [...jobs.map((job) => updates.find((value) => value.id === job.id) || job), ...updates.filter((job) => !ids.has(job.id))].filter((job) => !data.deletedIds?.includes(job.id));
}
export function completeRequest(account: string, entry: QueuedRequest, data: MutationData) {
  const remote = [...(data.jobs || []), ...(data.job ? [data.job] : [])];
  const local = [...(entry.optimistic.jobs || []), ...(entry.optimistic.job ? [entry.optimistic.job] : [])];
  const version = (id: string, previous: unknown) => remote.find((job) => job.id === id && local.some((value) => value.id === id && value.updatedAt === previous))?.updatedAt || previous;
  const entries = queuedRequests(account).filter((value) => value.id !== entry.id).map((value) => {
    if (!value.json) return value;
    const json = { ...value.json };
    if (value.entity.startsWith("job:")) {
      const id = value.entity.slice(4);
      for (const field of ["updatedAt", "baseUpdatedAt"]) if (json[field]) json[field] = version(id, json[field]);
    }
    if (Array.isArray(json.days)) json.days = json.days.map((day: { id: string; input: Record<string, unknown> }) => ({ ...day, input: { ...day.input, baseUpdatedAt: version(day.id, day.input.baseUpdatedAt) } }));
    if (Array.isArray(json.versions)) json.versions = json.versions.map((day: { id: string; updatedAt: string }) => ({ ...day, updatedAt: version(day.id, day.updatedAt) }));
    if (data.contact && entry.localVersion && value.entity === entry.entity)
      for (const field of ["updatedAt", "baseUpdatedAt"]) if (json[field] === entry.localVersion) json[field] = data.contact.updatedAt;
    return { ...value, json };
  });
  if (queuedRequests(account).length) writeQueue(account, entries);
  window.dispatchEvent(new CustomEvent<MutationEvent>(mutationEvent, { detail: { account, entry, data } }));
}
export function overlayJobs(jobs: Job[], entries: QueuedRequest[]): Job[] {
  return entries.reduce((result, entry) => {
    const data = entry.optimistic;
    return mergeJobs(result, data.deleted && entry.entity.startsWith("job:") ? { ...data, deletedIds: [entry.entity.slice(4)] } : data);
  }, jobs);
}
export function overlayContacts(contacts: ContactHistory[], entries: QueuedRequest[]): ContactHistory[] {
  let result = [...contacts];
  for (const entry of entries) {
    if (entry.optimistic.contact) {
      const contact = entry.optimistic.contact;
      const previous = result.find((value) => value.id === contact.id);
      const value = { ...contact, jobCount: previous?.jobCount || 0, lastJobDate: previous?.lastJobDate || "" };
      result = previous ? result.map((item) => item.id === contact.id ? value : item) : [value, ...result];
    } else if (entry.entity.startsWith("contact:") && entry.optimistic.deleted) result = result.filter((contact) => `contact:${contact.id}` !== entry.entity);
  }
  return result;
}
