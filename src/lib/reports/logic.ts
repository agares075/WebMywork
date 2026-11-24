import type { Job } from "../../types/job";
import { paymentTotals, unpaidAmount, effectivePaymentStatus } from "../payments/logic.ts";

export type ReportFilters = { month: string; client: string; status: string; outfit: string };
export function filterJobs(jobs: Job[], filters: ReportFilters, today: string): Job[] {
  return jobs.filter((job) => job.syncStatus !== "delete_pending" && (!filters.month || job.workDate.startsWith(filters.month)) && (!filters.client || job.client === filters.client) && (!filters.status || effectivePaymentStatus(job, today) === filters.status) && (!filters.outfit || job.outfit === filters.outfit));
}
export function unpaidJobs(jobs: Job[]): Job[] {
  return jobs.filter((job) => unpaidAmount(job) > 0).sort((a, b) => a.expectedPaymentDate.localeCompare(b.expectedPaymentDate) || a.workDate.localeCompare(b.workDate) || a.id.localeCompare(b.id));
}
export function chartMonths(jobs: Job[], endingMonth: string) {
  const end = new Date(`${endingMonth}-01T00:00:00Z`);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(end);
    date.setUTCMonth(date.getUTCMonth() - 5 + index);
    const month = date.toISOString().slice(0, 7);
    return { month, ...paymentTotals(jobs.filter((job) => job.workDate.startsWith(month))) };
  });
}
