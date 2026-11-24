import type { z } from "zod";
import type { jobInputSchema } from "@/lib/jobs/validation";

export type JobInput = z.infer<typeof jobInputSchema>;
export type Expense = JobInput["expenses"][number];
export type Job = Omit<JobInput, "baseUpdatedAt"> & {
  id: string;
  totalHours: number;
  expectedPaymentDate: string;
  paymentStatus: string;
  paidAmount: number;
  paidDate: string;
  teamMemberIds: string[];
  calendarEventId: string;
  reminderEventId: string;
  syncStatus: "pending" | "synced" | "delete_pending";
  createdAt: string;
  updatedAt: string;
};
export type JobMutation = { job?: Job; deleted?: boolean; warning?: string };
