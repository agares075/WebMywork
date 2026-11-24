import { sumMoney } from "../calculations.ts";
import type { Job } from "../../types/job";

export const paymentStatuses = ["not_invoiced", "waiting_for_payment", "partially_paid", "paid", "overdue", "cancelled"] as const;
export type PaymentStatus = typeof paymentStatuses[number];
export type PaymentFields = Pick<Job, "income" | "paymentStatus" | "paidAmount" | "expectedPaymentDate">;
export function effectivePaymentStatus(job: PaymentFields, today: string): PaymentStatus {
  if (job.paymentStatus === "cancelled" || job.paymentStatus === "paid") return job.paymentStatus;
  if (job.income > 0 && Math.round(job.paidAmount * 100) >= Math.round(job.income * 100)) return "paid";
  if (job.expectedPaymentDate < today && Math.round(job.income * 100) > Math.round(job.paidAmount * 100)) return "overdue";
  return paymentStatuses.includes(job.paymentStatus as PaymentStatus) ? job.paymentStatus as PaymentStatus : "not_invoiced";
}
export function unpaidAmount(job: Pick<Job, "income" | "paidAmount" | "paymentStatus" | "syncStatus">): number {
  if (["paid", "cancelled"].includes(job.paymentStatus) || job.syncStatus === "delete_pending") return 0;
  return Math.max(0, sumMoney([job.income, -job.paidAmount]));
}
export function paymentTotals(jobs: Pick<Job, "income" | "expenses" | "paidAmount" | "paymentStatus" | "syncStatus">[]) {
  const included = jobs.filter((job) => job.syncStatus !== "delete_pending");
  const income = sumMoney(included.filter((job) => job.paymentStatus !== "cancelled").map((job) => job.income));
  const expenses = sumMoney(included.flatMap((job) => job.expenses.map((expense) => expense.amount)));
  return { income, expenses, net: sumMoney([income, -expenses]), outstanding: sumMoney(included.map(unpaidAmount)) };
}
