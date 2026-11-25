import { randomUUID } from "node:crypto";
import { requirePageSession } from "@/lib/auth/session";
import { readJobStore } from "@/lib/sheets/job-store";
import { emptyJob } from "@/lib/jobs/defaults";
import { bangkokDate } from "@/lib/calculations";
import { isCalendarDate } from "@/lib/calendar";
import { contactHistory } from "@/lib/contacts/service";
import { MultiDayJobForm } from "@/components/jobs/multi-day-job-form";

export const dynamic = "force-dynamic";
export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requirePageSession();
  const { date } = await searchParams;
  const store = await readJobStore();
  const contacts = await contactHistory(store.jobs);
  return <main className="job-form-page"><MultiDayJobForm id={randomUUID()} initial={emptyJob(date && isCalendarDate(date) ? date : bangkokDate())} clients={[...new Set(store.jobs.map((job) => job.client))].sort()} contacts={contacts} email={session.user?.email ?? ""} /></main>;
}
