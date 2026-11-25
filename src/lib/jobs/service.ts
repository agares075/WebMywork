import "server-only";
import { readRecords } from "@/lib/sheets/record-store";
import { deleteJobFiles } from "@/lib/files/cleanup";
import { effectivePaymentStatus } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import { buildJob } from "@/lib/sheets/job-mapping";
import { readJobStore, writeJob, updateSyncState, removeJob, type JobStore } from "@/lib/sheets/job-store";
import { syncJobCalendar } from "@/lib/google/calendar";
import { t } from "@/lib/i18n";
import type { Job, JobInput, JobMutation } from "@/types/job";

export class JobError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
async function finishSync(store: JobStore, job: Job): Promise<JobMutation> {
  let pending = job;
  try {
    const synced = await syncJobCalendar(job, false, async (planned) => {
      await updateSyncState(store, planned);
      pending = planned;
    });
    await updateSyncState(store, synced);
    return { job: synced };
  } catch {
    return { job: pending, warning: `${t.jobs.calendarWarning} ${t.jobs.calendarPermission}` };
  }
}
export async function saveJob(id: string, input: JobInput): Promise<JobMutation> {
  const store = await readJobStore();
  const previous = store.jobs.find((job) => job.id === id);
  if (previous?.syncStatus === "delete_pending") throw new JobError(409, t.jobs.deletePending);
  if (previous && input.baseUpdatedAt !== previous.updatedAt) {
    const unchanged = Object.entries(input).filter(([key]) => key !== "baseUpdatedAt").every(([key, value]) => JSON.stringify(previous[key as keyof Job]) === JSON.stringify(value));
    if (unchanged) return finishSync(store, previous);
    throw new JobError(409, t.jobs.conflict);
  }
  if (!previous && input.baseUpdatedAt) throw new JobError(404, t.jobs.notFound);
  if (input.teamMemberIds?.length) {
    const contacts = await readRecords("Contacts");
    if (input.teamMemberIds.some((member) => !contacts.rows.some((row) => row[0] === member))) throw new JobError(409, t.contacts.missing);
  }
  if (previous?.jobGroupId && store.jobs.some((job) => job.id !== id && job.jobGroupId === previous.jobGroupId && job.workDate === input.workDate)) throw new JobError(409, "มีวันที่นี้อยู่ในกลุ่มแล้ว กรุณาเลือกวันอื่น");
  const job = buildJob(id, input, previous);
  if (Math.round(job.income * 100) < Math.round(job.paidAmount * 100)) throw new JobError(400, "รายรับต้องไม่น้อยกว่ายอดที่รับแล้ว กรุณาแก้ไขการชำระเงินก่อน");
  if (job.paymentStatus === "paid" && job.paidAmount < job.income) job.paymentStatus = job.paidAmount > 0 ? "partially_paid" : "waiting_for_payment";
  job.paymentStatus = effectivePaymentStatus(job, bangkokDate());
  await writeJob(store, job);
  return finishSync(store, job);
}
export async function retryJobSync(id: string): Promise<JobMutation> {
  const store = await readJobStore();
  const job = store.jobs.find((value) => value.id === id);
  if (!job) throw new JobError(404, t.jobs.notFound);
  if (job.syncStatus === "delete_pending") return deleteJob(id, job.updatedAt);
  return finishSync(store, job);
}
export async function deleteJob(id: string, version: string): Promise<JobMutation> {
  const store = await readJobStore();
  const previous = store.jobs.find((job) => job.id === id);
  if (!previous) return { deleted: true };
  if (previous.updatedAt !== version) throw new JobError(409, t.jobs.conflict);
  const job: Job = { ...previous, syncStatus: "delete_pending", updatedAt: new Date().toISOString() };
  await writeJob(store, job);
  try {
    await syncJobCalendar(job, true);
    await deleteJobFiles(id);
    await removeJob(store, job);
    return { deleted: true };
  } catch {
    return { job, warning: `${t.jobs.deleteWarning} กรุณาตรวจการเชื่อมต่อ Google Calendar และ Google Drive แล้วลองอีกครั้ง` };
  }
}
