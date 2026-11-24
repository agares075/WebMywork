import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/auth/session";
import { readJobStore } from "@/lib/sheets/job-store";
import { jobToInput } from "@/lib/jobs/defaults";
import { contactHistory } from "@/lib/contacts/service";
import { JobForm } from "@/components/jobs/job-form";

export const dynamic = "force-dynamic";
export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePageSession();
  const { id } = await params;
  const store = await readJobStore();
  const contacts = await contactHistory(store.jobs);
  const job = store.jobs.find((value) => value.id === id);
  if (!job || job.syncStatus === "delete_pending") notFound();
  return <main className="job-form-page"><JobForm id={id} initialJob={job} initial={jobToInput(job)} clients={[...new Set(store.jobs.map((value) => value.client))].sort()} contacts={contacts} email={session.user?.email ?? ""} editing /></main>;
}
