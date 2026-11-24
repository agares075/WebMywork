import "server-only";
import { readJobStore } from "@/lib/sheets/job-store";
import { JobError } from "@/lib/jobs/service";
import { effectivePaymentStatus } from "./logic";
import { paymentAmountError, type PaymentInput } from "./validation";
import { bangkokDate } from "@/lib/calculations";
import { t } from "@/lib/i18n";
import type { Job } from "@/types/job";

export async function updatePayment(id: string, input: PaymentInput): Promise<Job> {
  const store = await readJobStore();
  const previous = store.jobs.find((job) => job.id === id);
  if (!previous) throw new JobError(404, t.jobs.notFound);
  if (previous.syncStatus === "delete_pending") throw new JobError(409, t.jobs.deletePending);
  const amountError = paymentAmountError(input, previous.income);
  if (amountError) throw new JobError(400, amountError);
  const job = { ...previous, paymentStatus: effectivePaymentStatus({ ...previous, ...input }, bangkokDate()), paidAmount: input.paidAmount, paidDate: input.paidDate, updatedAt: new Date().toISOString() };
  if (previous.updatedAt !== input.updatedAt) {
    if (previous.paymentStatus === job.paymentStatus && previous.paidAmount === job.paidAmount && previous.paidDate === job.paidDate) return previous;
    throw new JobError(409, t.payment.conflict);
  }
  const index = store.jobRows.findIndex((row) => row[0] === id);
  await store.client.spreadsheets.values.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: {
    valueInputOption: "RAW", data: [
      { range: `'Jobs'!Q${index + 2}:S${index + 2}`, values: [[job.paymentStatus, job.paidAmount, job.paidDate]] },
      { range: `'Jobs'!X${index + 2}`, values: [[job.updatedAt]] }
    ]
  } });
  return job;
}
