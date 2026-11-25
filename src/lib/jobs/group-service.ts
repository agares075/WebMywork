import "server-only";
import { readJobStore, writeJobs, updateManySyncStates, removeJobs } from "@/lib/sheets/job-store";
import { buildJob } from "@/lib/sheets/job-mapping";
import { readRecords } from "@/lib/sheets/record-store";
import { syncJobCalendar } from "@/lib/google/calendar";
import { deleteManyJobFiles } from "@/lib/files/cleanup";
import { JobError } from "./service";
import { effectivePaymentStatus } from "@/lib/payments/logic";
import { paymentAmountError } from "@/lib/payments/validation";
import { addDays, bangkokDate } from "@/lib/calculations";
import type { GroupInput } from "./group-validation";
import type { Job } from "@/types/job";

async function syncDays(jobs: Job[]) {
  const result: Job[] = [];
  const planned = new Map(jobs.map((job) => [job.id, job]));
  let failed = false;
  for (let start = 0; start < jobs.length; start += 3) {
    const outcomes = await Promise.allSettled(jobs.slice(start, start + 3).map((job) => syncJobCalendar(job, false, async (next) => { await updateManySyncStates([next]); planned.set(job.id, next); })));
    outcomes.forEach((outcome, index) => { if (outcome.status === "fulfilled") result.push(outcome.value); else { failed = true; result.push(planned.get(jobs[start + index].id)!); } });
  }
  await updateManySyncStates(result);
  return { jobs: result, ...(failed ? { warning: "บันทึกทุกวันแล้ว แต่บางวันยังรอซิงก์ Google Calendar" } : {}) };
}
export async function saveGroup(groupId: string, body: GroupInput) {
  const store = await readJobStore();
  const existing = store.jobs.filter((job) => job.jobGroupId === groupId);
  if (existing.length && (existing.length !== body.days.length || existing.some((job) => !body.days.some((day) => day.id === job.id)))) throw new JobError(409, "สมาชิกกลุ่มเปลี่ยนแล้ว กรุณาเปิดกลุ่มใหม่ก่อนบันทึก");
  const contacts = await readRecords("Contacts");
  const dates = body.days.map((day) => day.input.workDate).sort();
  const lastDate = dates[dates.length - 1];
  const jobs = body.days.map((day) => {
    const previous = store.jobs.find((job) => job.id === day.id);
    if (previous && previous.jobGroupId !== groupId) throw new JobError(409, "รหัสงานนี้เป็นของงานอื่น");
    if (previous?.syncStatus === "delete_pending") throw new JobError(409, "มีวันในกลุ่มกำลังรอลบ");
    if (previous && previous.updatedAt !== day.input.baseUpdatedAt) {
      const same = Object.entries(day.input).filter(([key]) => key !== "baseUpdatedAt").every(([key, value]) => JSON.stringify(previous[key as keyof Job]) === JSON.stringify(value));
      const samePayment = !day.payment || (previous.paidAmount === day.payment.paidAmount && previous.paidDate === day.payment.paidDate && previous.paymentStatus === effectivePaymentStatus({ ...previous, ...day.payment }, bangkokDate()));
      if (!same || !samePayment || (body.payAfterLast !== undefined && Boolean(previous.paymentBaseDate) !== body.payAfterLast)) throw new JobError(409, "งานบางวันเปลี่ยนแล้ว กรุณาเปิดกลุ่มใหม่ก่อนบันทึก");
    }
    if (!previous && day.input.baseUpdatedAt) throw new JobError(404, "ไม่พบงานบางวันในกลุ่ม");
    if (day.input.teamMemberIds?.some((id) => !contacts.rows.some((row) => row[0] === id))) throw new JobError(409, "กรุณาตรวจรายชื่อทีมอีกครั้ง");
    const job = buildJob(day.id, day.input, previous);
    job.jobGroupId = groupId;
    job.paymentBaseDate = body.payAfterLast === undefined ? previous?.paymentBaseDate || "" : body.payAfterLast ? lastDate : "";
    job.expectedPaymentDate = addDays(job.paymentBaseDate || job.workDate, job.creditDays);
    if (day.payment) {
      const message = paymentAmountError(day.payment, job.income);
      if (message) throw new JobError(400, `${job.workDate}: ${message}`);
      Object.assign(job, day.payment);
    }
    if (job.paidAmount > job.income) throw new JobError(400, `${job.workDate}: รายรับต้องไม่น้อยกว่ายอดที่รับแล้ว`);
    if (job.paymentStatus === "paid" && job.paidAmount < job.income) job.paymentStatus = job.paidAmount > 0 ? "partially_paid" : "waiting_for_payment";
    job.paymentStatus = effectivePaymentStatus(job, bangkokDate());
    return job;
  });
  await writeJobs(store, jobs);
  return syncDays(jobs);
}
export async function deleteGroup(groupId: string, versions: { id: string; updatedAt: string }[]) {
  const store = await readJobStore();
  const members = store.jobs.filter((job) => job.jobGroupId === groupId);
  if (!members.length) return { deleted: true, deletedIds: versions.map((value) => value.id) };
  if (members.some((job) => !versions.some((value) => value.id === job.id && value.updatedAt === job.updatedAt))) throw new JobError(409, "กลุ่มนี้มีการเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนลบ");
  const pending = members.map((job): Job => ({ ...job, syncStatus: "delete_pending" }));
  await writeJobs(store, pending);
  let removed: Job[] = [];
  for (let start = 0; start < pending.length; start += 3) {
    const batch = pending.slice(start, start + 3);
    const outcomes = await Promise.allSettled(batch.map((job) => syncJobCalendar(job, true)));
    outcomes.forEach((outcome, index) => { if (outcome.status === "fulfilled") removed.push(batch[index]); });
  }
  try { await deleteManyJobFiles(removed.map((job) => job.id)); }
  catch { removed = []; }
  if (removed.length) await removeJobs(removed);
  const ids = removed.map((job) => job.id);
  return { deleted: ids.length === pending.length, deletedIds: ids, jobs: pending.filter((job) => !ids.includes(job.id)), ...(ids.length !== pending.length ? { warning: "บางวันยังลบไม่สำเร็จ กรุณาลองลบวันที่รออีกครั้ง" } : {}) };
}
