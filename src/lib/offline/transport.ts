import { effectivePaymentStatus } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import type { Job } from "@/types/job";
import { binaryStore } from "./binary-store";
import { appendRequest, completeRequest, queuedRequests, writeQueue } from "./store";
import type { MutationData, MutationRequest, QueuedRequest } from "@/types/offline";

export class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function send(entry: QueuedRequest): Promise<MutationData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    let body: BodyInit | undefined;
    if (entry.form && entry.blobKey) {
      const bytes = await binaryStore<Blob>(entry.blobKey, "get");
      if (!bytes) throw new RequestError("ไม่พบไฟล์ที่เก็บไว้ กรุณาเลือกเอกสารใหม่", 400);
      const form = new FormData(); form.set("id", entry.form.id); form.set("file", bytes, entry.form.name); body = form;
    } else if (entry.json) body = JSON.stringify(entry.json);
    const response = await fetch(entry.url, { method: entry.method, ...(entry.json ? { headers: { "Content-Type": "application/json" } } : {}), body, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new RequestError(data.error || "ส่งข้อมูลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่", response.status);
    return data as MutationData;
  } finally { clearTimeout(timer); }
}
function retryable(error: unknown) { return !(error instanceof RequestError) || error.status >= 500 || [408, 429].includes(error.status); }
const active = new Set<string>();
export async function mutateRequest(account: string, input: MutationRequest): Promise<MutationData> {
  const { file, fileId, ...details } = input;
  const entry: QueuedRequest = { ...details, id: crypto.randomUUID() };
  if (file) {
    entry.blobKey = `upload:${account}:${entry.id}`;
    entry.form = { id: fileId || "", name: file.name, type: file.type };
    await binaryStore(entry.blobKey, "put", file);
  }
  const enqueue = () => appendRequest(account, entry);
  const clean = async () => { if (entry.blobKey) await binaryStore(entry.blobKey, "delete").catch(() => undefined); };
  if (!navigator.onLine || queuedRequests(account).length || active.has(account)) {
    try { enqueue(); } catch (error) { await clean(); throw error; }
    return { ...entry.optimistic, queued: true };
  }
  const run = async (): Promise<MutationData> => {
    if (queuedRequests(account).length || active.has(account)) { try { enqueue(); } catch (error) { await clean(); throw error; } return { ...entry.optimistic, queued: true }; }
    // Persist intent before attempting the network, including online saves.
    try { enqueue(); } catch (error) { await clean(); throw error; }
    active.add(account);
    try {
      const result = await send(entry);
      completeRequest(account, entry, result); await clean(); return result;
    } catch (error) {
      if (!retryable(error)) {
        writeQueue(account, queuedRequests(account).filter((value) => value.id !== entry.id)); await clean(); throw error;
      }
      return { ...entry.optimistic, queued: true };
    } finally { active.delete(account); }
  };
  if (navigator.locks) return navigator.locks.request(`daily-work-log:${account}:sync`, run);
  return run();
}
async function replay(account: string, entry: QueuedRequest): Promise<MutationData> {
  try { return await send(entry); }
  catch (error) {
    if (!(error instanceof RequestError) || error.status !== 409 || !entry.base || !entry.json || !["PUT", "PATCH"].includes(entry.method) || entry.form) throw error;
    const isContact = entry.entity.startsWith("contact:");
    const response = await fetch(isContact ? "/api/contacts" : "/api/jobs", { cache: "no-store" });
    if (!response.ok) throw error;
    const result = await response.json();
    const id = entry.entity.slice(entry.entity.indexOf(":") + 1);
    const current = (isContact ? result.contacts : result.jobs).find((value: { id: string }) => value.id === id) as Record<string, unknown> | undefined;
    if (!current) throw error;
    let safe = false;
    if (entry.url.endsWith("/payment")) {
      const base = entry.base as unknown as Job;
      const live = current as unknown as Job;
      safe = base.income === live.income && base.expectedPaymentDate === live.expectedPaymentDate && base.paidAmount === live.paidAmount && base.paidDate === live.paidDate && effectivePaymentStatus(base, bangkokDate()) === effectivePaymentStatus(live, bangkokDate());
    } else {
      safe = Object.keys(entry.json).filter((field) => !["baseUpdatedAt", "updatedAt"].includes(field)).every((field) => JSON.stringify(current[field] ?? (field === "teamMemberIds" ? [] : undefined)) === JSON.stringify(entry.base![field] ?? (field === "teamMemberIds" ? [] : undefined)));
    }
    if (!safe) throw error;
    const field = isContact || entry.url.endsWith("/payment") ? "updatedAt" : "baseUpdatedAt";
    entry.json = { ...entry.json, [field]: current.updatedAt };
    writeQueue(account, queuedRequests(account).map((value) => value.id === entry.id ? entry : value));
    return send(entry);
  }
}
export async function flushQueue(account: string): Promise<number> {
  if (active.has(account)) return 0;
  active.add(account);
  let count = 0;
  try {
  while (navigator.onLine) {
    const entry = queuedRequests(account)[0];
    if (!entry || entry.blocked) break;
    try {
      const result = await replay(account, entry);
      completeRequest(account, entry, result);
      if (entry.blobKey) await binaryStore(entry.blobKey, "delete").catch(() => undefined);
      count++;
    } catch (error) {
      if (!retryable(error)) writeQueue(account, queuedRequests(account).map((value) => value.id === entry.id ? { ...value, blocked: error instanceof Error ? error.message : "กรุณาตรวจข้อมูลก่อนลองใหม่" } : value));
      break;
    }
  }
  return count;
  } finally { active.delete(account); }
}
