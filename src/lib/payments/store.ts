import "server-only";
import { bangkokDate } from "@/lib/calculations";
import { effectivePaymentStatus } from "./logic";
import type { Job } from "@/types/job";
import type { JobStore } from "@/lib/sheets/job-store";

type Store = Pick<JobStore, "client" | "spreadsheetId" | "jobRows">;
export async function markOverdue(store: Store, jobs: Job[]): Promise<Job[]> {
  const today = bangkokDate();
  const now = new Date().toISOString();
  const changed = jobs.filter((job) => job.syncStatus !== "delete_pending" && job.paymentStatus !== effectivePaymentStatus(job, today));
  if (!changed.length) return jobs;
  const data = changed.flatMap((job) => {
    const index = store.jobRows.findIndex((row) => row[0] === job.id);
    return [{ range: `'Jobs'!Q${index + 2}`, values: [[effectivePaymentStatus(job, today)]] }, { range: `'Jobs'!X${index + 2}`, values: [[now]] }];
  });
  await store.client.spreadsheets.values.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: { valueInputOption: "RAW", data } });
  return jobs.map((job) => changed.includes(job) ? { ...job, paymentStatus: effectivePaymentStatus(job, today), updatedAt: now } : job);
}
