import { requirePageSession } from "@/lib/auth/session";
import { getEnvironment } from "@/lib/env";
import { readJobStore } from "@/lib/sheets/job-store";
import { connectionFailure } from "@/lib/sheets/errors";
import { bangkokDate } from "@/lib/calculations";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import type { Job } from "@/types/job";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  await requirePageSession();
  let jobs: Job[] = [];
  let error = "";
  try { jobs = (await readJobStore()).jobs; }
  catch (reason) { error = connectionFailure(reason).message; }
  return <DashboardScreen initialJobs={jobs} initialMonth={bangkokDate().slice(0, 7)} spreadsheetUrl={`https://docs.google.com/spreadsheets/d/${getEnvironment().GOOGLE_SPREADSHEET_ID}/edit`} initialError={error} />;
}
