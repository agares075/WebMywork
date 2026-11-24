import Link from "next/link";
import { PaymentControl, type PaymentSave } from "./payment-control";
import { unpaidAmount } from "@/lib/payments/logic";
import { formatMoney, t } from "@/lib/i18n";
import { bangkokDate, paymentCountdown, sumMoney } from "@/lib/calculations";
import { formatDay } from "@/lib/calendar";
import type { Job } from "@/types/job";

export function JobCard({ job, busy, onDelete, onSync, onPayment, showWorkDate = false }: { job: Job; busy: boolean; onDelete: () => void; onSync: () => void; onPayment: PaymentSave; showWorkDate?: boolean }) {
  return <article className="job-card">
    <div className="job-card-heading"><div><p className="job-time">{showWorkDate ? `${formatDay(job.workDate, { day: "numeric", month: "short", year: "numeric" })} · ` : ""}{job.startTime}–{job.endTime}</p><h3>{job.client}</h3></div><span className="money-income job-income">{formatMoney(job.income)}</span></div>
    {job.details && <p className="job-details">{job.details}</p>}
    {job.location && <a className="job-location text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`} target="_blank" rel="noopener noreferrer">{job.location}</a>}
    {job.expenses.length > 0 && <p className="job-expense money-expense">{t.jobs.expenses} {formatMoney(sumMoney(job.expenses.map((item) => item.amount)))}</p>}
    <p className="job-payment-date">{t.jobs.expected} {formatDay(job.expectedPaymentDate, { day: "numeric", month: "short" })}{unpaidAmount(job) > 0 ? ` · ${paymentCountdown(job.expectedPaymentDate, bangkokDate())}` : ""}</p>
    <PaymentControl job={job} disabled={busy} onSave={onPayment} />
    {job.syncStatus !== "synced" && <div className="job-sync"><span>{job.syncStatus === "delete_pending" ? t.jobs.deletePending : t.jobs.syncPending}</span><button type="button" className="button button-quiet" disabled={busy} onClick={onSync}>{busy ? t.jobs.syncing : t.jobs.syncRetry}</button></div>}
    <div className="job-card-actions">{job.syncStatus !== "delete_pending" && <Link className="button button-secondary" href={`/jobs/${job.id}`}>{t.jobs.edit}</Link>}<button type="button" className="button button-quiet delete-text" disabled={busy} onClick={onDelete}>{t.jobs.delete}</button></div>
  </article>;
}
