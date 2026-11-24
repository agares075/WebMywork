import { requirePageSession } from "@/lib/auth/session";
import { readJobStore } from "@/lib/sheets/job-store";
import { connectionFailure } from "@/lib/sheets/errors";
import { CalendarHome } from "@/components/calendar/calendar-home";
import { bangkokDate } from "@/lib/calculations";
import { isCalendarDate } from "@/lib/calendar";
import type { Job } from "@/types/job";

export const dynamic = "force-dynamic";
export default async function HomePage({ searchParams }: { searchParams: Promise<{ date?: string; notice?: string }> }) {
  await requirePageSession();
  const params = await searchParams;
  const date = params.date && isCalendarDate(params.date) ? params.date : bangkokDate();
  let jobs: Job[] = [];
  let error = "";
  try { jobs = (await readJobStore()).jobs; }
  catch (reason) { error = connectionFailure(reason).message; }
  return <CalendarHome initialJobs={jobs} initialDate={date} initialError={error} notice={params.notice} />;
}
