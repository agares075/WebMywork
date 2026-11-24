import type { Job, JobInput } from "@/types/job";

export function emptyJob(workDate: string): JobInput {
  return { client: "", workDate, startTime: "09:00", endTime: "18:00", details: "", location: "", checkIn: "", checkOut: "", income: 0, outfit: "All Black Private", shoes: "1 – Black canvas shoes", creditDays: 0, comment: "", reminderEnabled: false, expenses: [], teamMemberIds: [] };
}

export function jobToInput(job: Job): JobInput {
  return {
    client: job.client, workDate: job.workDate, startTime: job.startTime, endTime: job.endTime,
    details: job.details, location: job.location, checkIn: job.checkIn, checkOut: job.checkOut,
    income: job.income, outfit: job.outfit, shoes: job.shoes, creditDays: job.creditDays,
    comment: job.comment, reminderEnabled: job.reminderEnabled, expenses: job.expenses,
    teamMemberIds: job.teamMemberIds, baseUpdatedAt: job.updatedAt
  };
}
