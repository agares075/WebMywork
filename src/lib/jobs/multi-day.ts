import { addDays } from "../calculations.ts";
import type { Job, JobInput } from "../../types/job";
import type { PaymentInput } from "../payments/validation";

export const maxWorkDays = 31;
export type DayPayment = Pick<PaymentInput, "paymentStatus" | "paidAmount" | "paidDate">;
export type DayOverride = Partial<JobInput> & { payment?: DayPayment };
export type MultiDayDraft = {
  id: string; common: JobInput; dates: string[]; mode: "range" | "individual";
  rangeStart: string; rangeEnd: string; overrides: Record<string, DayOverride>;
  incomeMode: "per_day" | "total"; totalIncome: number; payAfterLast: boolean;
  submitted?: boolean; confirmed?: boolean;
};
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function selectedDates(dates: string[]): string[] {
  if (!dates.length || dates.length > maxWorkDays || dates.some((date) => !validDate(date)) || new Set(dates).size !== dates.length) throw new Error("กรุณาเลือกวันที่ไม่ซ้ำกัน 1–31 วัน");
  return [...dates].sort();
}
export function dateRange(start: string, end: string): string[] {
  if (!validDate(start) || !validDate(end) || end < start) throw new Error("วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
  const count = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
  if (count > maxWorkDays) throw new Error("เลือกได้ไม่เกิน 31 วันต่อการบันทึก");
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
export function toggleDate(dates: string[], date: string): string[] {
  if (!validDate(date)) throw new Error("วันที่ไม่ถูกต้อง");
  if (dates.includes(date)) return dates.filter((value) => value !== date);
  if (dates.length >= maxWorkDays) throw new Error("เลือกได้ไม่เกิน 31 วัน");
  return [...dates, date].sort();
}
export function splitIncome(total: number, count: number): number[] {
  if (!Number.isFinite(total) || total < 0 || Math.abs(total * 100 - Math.round(total * 100)) > .0001 || !Number.isInteger(count) || count < 1 || count > maxWorkDays) throw new Error("ยอดเงินหรือจำนวนวันไม่ถูกต้อง");
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / count);
  return Array.from({ length: count }, (_, index) => (each + (index < cents % count ? 1 : 0)) / 100);
}
export function datedId(seed: string, date: string): string { return `${seed.slice(0, 24)}${date.replaceAll("-", "")}${seed.slice(-4)}`; }
export function shiftStamp(value: string, fromDate: string, toDate: string): string {
  if (!value) return "";
  const days = Math.round((Date.parse(`${value.slice(0, 10)}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
  return `${addDays(toDate, days)}${value.slice(10)}`;
}
export function expandDays(draft: MultiDayDraft) {
  const dates = selectedDates(draft.dates);
  const incomes = draft.incomeMode === "total" ? splitIncome(draft.totalIncome, dates.length) : dates.map(() => draft.common.income);
  return dates.map((date, index) => {
    const override = draft.overrides[date] || {};
    const { payment, ...fields } = override;
    const input: JobInput = { ...draft.common, workDate: date, income: incomes[index],
      checkIn: shiftStamp(draft.common.checkIn, draft.common.workDate, date), checkOut: shiftStamp(draft.common.checkOut, draft.common.workDate, date),
      ...fields, expenses: (fields.expenses || draft.common.expenses).map((expense) => ({ ...expense, id: datedId(expense.id, date) })) };
    input.workDate = date;
    return { id: index === 0 ? draft.id : datedId(draft.id, date), input, payment };
  });
}
export function groupMembers(job: Job, jobs: Job[]): Job[] {
  return (job.jobGroupId ? jobs.filter((value) => value.jobGroupId === job.jobGroupId) : [job]).sort((a, b) => a.workDate.localeCompare(b.workDate) || a.id.localeCompare(b.id));
}
export function groupDayLabel(job: Job, jobs: Job[]): string {
  const members = groupMembers(job, jobs);
  return job.jobGroupId && members.length > 1 ? `วันที่ ${members.findIndex((value) => value.id === job.id) + 1}/${members.length}` : "";
}
export function applyGroupChanges(source: Job, updated: JobInput, members: Job[]) {
  const keys = Object.keys(updated).filter((key) => !["workDate", "baseUpdatedAt"].includes(key)) as (keyof JobInput)[];
  return members.map((member) => {
    const input: JobInput = { client: member.client, workDate: member.workDate, startTime: member.startTime, endTime: member.endTime, details: member.details, location: member.location, checkIn: member.checkIn, checkOut: member.checkOut, income: member.income, outfit: member.outfit, shoes: member.shoes, creditDays: member.creditDays, comment: member.comment, reminderEnabled: member.reminderEnabled, expenses: member.expenses, teamMemberIds: member.teamMemberIds, baseUpdatedAt: member.updatedAt };
    for (const key of keys) {
      if (JSON.stringify(updated[key]) === JSON.stringify(source[key as keyof Job])) continue;
      let value = updated[key];
      if ((key === "checkIn" || key === "checkOut") && typeof value === "string") value = shiftStamp(value, source.workDate, member.workDate);
      if (key === "expenses") value = updated.expenses.map((expense) => ({ ...expense, id: datedId(expense.id, member.workDate) }));
      Object.assign(input, { [key]: value });
    }
    return { id: member.id, input };
  });
}
