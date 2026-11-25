import { sheetHeaders } from "./schema.ts";
import { addDays, hoursBetween } from "../calculations.ts";
import { jobInputSchema } from "../jobs/validation.ts";
import type { Job, JobInput, Expense } from "../../types/job";

type Cell = string | number | boolean;
export type SheetRow = Cell[];

export function buildJob(id: string, input: JobInput, previous?: Job): Job {
  const { baseUpdatedAt: _version, ...fields } = input;
  void _version;
  const now = new Date().toISOString();
  const paymentBaseDate = previous?.paymentBaseDate ? (previous.paymentBaseDate < input.workDate ? input.workDate : previous.paymentBaseDate) : "";
  return {
    ...fields, id, jobGroupId: previous?.jobGroupId || "", paymentBaseDate, totalHours: hoursBetween(input.checkIn, input.checkOut),
    expectedPaymentDate: addDays(paymentBaseDate || input.workDate, input.creditDays),
    paymentStatus: previous?.paymentStatus ?? "not_invoiced", paidAmount: previous?.paidAmount ?? 0,
    paidDate: previous?.paidDate ?? "", teamMemberIds: input.teamMemberIds ?? previous?.teamMemberIds ?? [],
    calendarEventId: previous?.calendarEventId || `d1${id.replaceAll("-", "")}`,
    reminderEventId: previous?.reminderEventId || (input.reminderEnabled ? `d2${id.replaceAll("-", "")}` : ""),
    syncStatus: "pending", createdAt: previous?.createdAt ?? now, updatedAt: now
  };
}

export function jobToRow(job: Job): SheetRow {
  return [job.id, job.client, job.workDate, job.startTime, job.endTime, job.details, job.location,
    job.checkIn, job.checkOut, job.totalHours, job.income, job.outfit, job.shoes, job.creditDays,
    job.expectedPaymentDate, job.comment, job.paymentStatus, job.paidAmount, job.paidDate,
    JSON.stringify(job.teamMemberIds), job.calendarEventId, job.reminderEventId, job.createdAt, job.updatedAt,
    job.reminderEnabled, job.syncStatus, job.jobGroupId, job.paymentBaseDate];
}

export function rowToJob(row: SheetRow, expenses: Expense[]): Job {
  const cell = Object.fromEntries(sheetHeaders.Jobs.map((name, index) => [name, row[index] ?? ""]));
  const input = jobInputSchema.parse({
    client: String(cell.client), workDate: String(cell.work_date), startTime: String(cell.start_time), endTime: String(cell.end_time),
    details: String(cell.details), location: String(cell.location), checkIn: String(cell.check_in), checkOut: String(cell.check_out),
    income: Number(cell.income), outfit: cell.outfit, shoes: cell.shoes, creditDays: Number(cell.credit_days),
    comment: String(cell.comment), reminderEnabled: cell.payment_reminder_enabled === true || cell.payment_reminder_enabled === "TRUE" || (cell.payment_reminder_enabled === "" && Boolean(cell.payment_reminder_event_id)), expenses
  });
  const team: unknown = JSON.parse(String(cell.team_member_ids || "[]"));
  if (!Array.isArray(team) || !team.every((value) => typeof value === "string")) throw new Error("Invalid team member IDs");
  return { ...input, id: String(cell.id), jobGroupId: String(cell.jobGroupId || ""), paymentBaseDate: String(cell.payment_base_date || ""), totalHours: hoursBetween(input.checkIn, input.checkOut),
    expectedPaymentDate: addDays(String(cell.payment_base_date || input.workDate), input.creditDays), paymentStatus: String(cell.payment_status), paidAmount: Number(cell.paid_amount),
    paidDate: String(cell.paid_date), teamMemberIds: team, calendarEventId: String(cell.calendar_event_id), reminderEventId: String(cell.payment_reminder_event_id),
    syncStatus: cell.calendar_sync_status === "synced" ? "synced" : cell.calendar_sync_status === "delete_pending" ? "delete_pending" : "pending",
    createdAt: String(cell.created_at), updatedAt: String(cell.updated_at) };
}

export function expenseToRow(expense: Expense, job: Job, createdAt = job.createdAt): SheetRow {
  return [expense.id, job.id, expense.label, expense.amount, createdAt, job.updatedAt];
}
