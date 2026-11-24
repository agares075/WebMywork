"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/ui/app-nav";
import { Brand } from "@/components/ui/brand";
import { AuthButton } from "@/components/auth/auth-button";
import { JobCard } from "@/components/jobs/job-card";
import { useLiveJobs } from "@/components/jobs/use-live-jobs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReportFilterFields } from "./report-filters";
import { IncomeChart } from "./income-chart";
import { filterJobs, unpaidJobs, chartMonths, type ReportFilters } from "@/lib/reports/logic";
import { paymentTotals } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import { formatDateTime, formatMoney, t } from "@/lib/i18n";
import type { Job, JobMutation } from "@/types/job";

export function DashboardScreen({ initialJobs, initialMonth, spreadsheetUrl, initialError = "" }: { initialJobs: Job[]; initialMonth: string; spreadsheetUrl: string; initialError?: string }) {
  const [busy, setBusy] = useState("");
  const live = useLiveJobs(initialJobs, Boolean(busy), initialError);
  const [filters, setFilters] = useState<ReportFilters>({ month: initialMonth, client: "", status: "", outfit: "" });
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [message, setMessage] = useState("");
  const today = bangkokDate();
  const selected = useMemo(() => filterJobs(live.jobs, filters, today), [live.jobs, filters, today]);
  const totals = paymentTotals(selected);
  const unpaid = unpaidJobs(selected);
  const points = chartMonths(filterJobs(live.jobs, { ...filters, month: "" }, today), filters.month || initialMonth);
  const csvUrl = `/api/export?${new URLSearchParams(filters)}`;
  async function mutate(job: Job, action: "delete" | "sync") {
    setBusy(job.id); live.setError(""); setMessage("");
    try {
      const response = await fetch(`/api/jobs/${job.id}${action === "sync" ? "/sync" : ""}`, { method: action === "sync" ? "POST" : "DELETE", ...(action === "delete" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updatedAt: job.updatedAt }) } : {}) });
      const data: JobMutation & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || t.jobs.saveFailed);
      live.setJobs((current) => data.deleted ? current.filter((value) => value.id !== job.id) : current.map((value) => value.id === job.id && data.job ? data.job : value));
      setMessage(data.warning || (data.deleted ? t.jobs.deleted : t.jobs.syncDone));
    } catch (reason) { live.setError(reason instanceof Error ? reason.message : t.jobs.saveFailed); }
    finally { setBusy(""); setDeleting(null); }
  }
  return <div className="workspace-layout"><header className="app-header"><div className="header-inner"><Brand /><AuthButton action="signOut" /></div></header><AppNav active="dashboard" /><main className="calendar-main dashboard-main"><div className="calendar-page-title"><div><p className="eyebrow muted">{t.reports.description}</p><h1>{t.reports.title}</h1></div><button type="button" className="button button-secondary" disabled={Boolean(busy) || live.refreshing || live.pendingPayment} onClick={() => void live.refresh()}>{live.refreshing ? t.reports.syncing : t.reports.refresh}</button></div><div className="report-actions"><a className="button button-secondary" href={spreadsheetUrl} target="_blank" rel="noopener noreferrer">{t.reports.openSheet}</a><a className="button button-primary" href={csvUrl} download>{t.reports.export}</a></div>
    {live.error && <div className="notice notice-error" role="alert">{live.error} <Link className="text-link" href="/settings">{t.jobs.settings}</Link></div>}{message && <div className="notice notice-feedback" role="status">{message}<button className="dismiss-notice" type="button" aria-label="ปิดข้อความ" onClick={() => setMessage("")}>×</button></div>}
    <ReportFilterFields filters={filters} onChange={setFilters} jobs={live.jobs.filter((job) => job.syncStatus !== "delete_pending")} currentMonth={initialMonth} />
    <p className="report-scope">{t.reports.scope}</p><div className="report-kpis" aria-live="polite">{(["income", "expenses", "net", "outstanding"] as const).map((key) => <section className="report-kpi" key={key}><h2>{t.reports[key]}</h2><strong className={key === "expenses" || (key === "net" && totals.net < 0) ? "money-expense" : "money-income"}>{formatMoney(totals[key])}</strong></section>)}</div><p className="report-freshness">{selected.length} {t.reports.results} · {live.checkedAt ? `${t.reports.lastChecked} ${formatDateTime(live.checkedAt)}` : t.reports.live}</p>
    <div className="report-content"><section className="unpaid-report"><div className="report-section-heading"><h2>{t.reports.unpaidTitle}</h2><p>{t.reports.unpaidSort}</p></div>{unpaid.length ? unpaid.map((job) => <JobCard key={job.id} showWorkDate job={job} busy={Boolean(busy) || live.pendingPayment} onDelete={() => setDeleting(job)} onSync={() => void mutate(job, "sync")} onPayment={live.savePayment} />) : <p className="empty-state">{t.reports.unpaidEmpty}</p>}</section><IncomeChart points={points} /></div>
  </main>{deleting && <ConfirmDialog title={t.jobs.deleteTitle} description={`${deleting.client} · ${t.jobs.deleteDescription}`} confirmLabel={t.jobs.deleteConfirm} busy={Boolean(busy)} onClose={() => setDeleting(null)} onConfirm={() => void mutate(deleting, "delete")} />}</div>;
}
