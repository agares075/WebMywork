"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppRuntime } from "@/components/ui/app-runtime";
import { Brand } from "@/components/ui/brand";
import { AppNav } from "@/components/ui/app-nav";
import { AuthButton } from "@/components/auth/auth-button";
import { DeleteJobDialog } from "@/components/jobs/delete-job-dialog";
import { jobMutation } from "@/lib/jobs/mutation";
import { groupDayLabel } from "@/lib/jobs/multi-day";
import { mergeJobs } from "@/lib/offline/store";
import { useLiveJobs } from "@/components/jobs/use-live-jobs";
import { JobCard } from "@/components/jobs/job-card";
import { CalendarGrid } from "./calendar-grid";
import { addDays, bangkokDate } from "@/lib/calculations";
import { formatDay, shiftMonth } from "@/lib/calendar";
import { t } from "@/lib/i18n";
import type { Job } from "@/types/job";

type View = "month" | "week" | "list";
export function CalendarHome({ initialJobs, initialDate, initialError = "", notice = "" }: { initialJobs: Job[]; initialDate: string; initialError?: string; notice?: string }) {
  const [selected, setSelected] = useState(initialDate);
  const [anchor, setAnchor] = useState(initialDate);
  const [view, setView] = useState<View>("month");
  const [message, setMessage] = useState(notice === "sync" ? t.jobs.calendarWarning : notice === "saved" ? t.jobs.saved : "");
  const { mutate: requestMutation } = useAppRuntime();
  const [busy, setBusy] = useState("");
  const [deleting, setDeleting] = useState<Job | null>(null);
  const { jobs, setJobs, error, setError, refresh, refreshing, pendingPayment, savePayment } = useLiveJobs(initialJobs, Boolean(busy), initialError);
  const today = bangkokDate();
  function pick(date: string) { setSelected(date); setAnchor(date); }
  function navigate(offset: number) { pick(view === "week" ? addDays(anchor, offset * 7) : shiftMonth(anchor, offset)); }
  async function mutate(job: Job, action: "delete" | "sync", all = false) {
    setBusy(job.id); setError(""); setMessage("");
    try {
      const data = await requestMutation(jobMutation(job, action, jobs, all));
      setJobs((current) => mergeJobs(current, data.deleted ? { ...data, deletedIds: data.deletedIds || [job.id] } : data));
      setMessage(data.warning || (data.deleted ? t.jobs.deleted : t.jobs.syncDone));
      setDeleting(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.jobs.saveFailed); setDeleting(null); }
    finally { setBusy(""); }
  }
  const byTime = (a: Job, b: Job) => a.startTime.localeCompare(b.startTime) || a.client.localeCompare(b.client, "th");
  const daily = jobs.filter((job) => job.workDate === selected).sort(byTime);
  const monthly = jobs.filter((job) => job.workDate.slice(0, 7) === anchor.slice(0, 7)).sort((a, b) => a.workDate.localeCompare(b.workDate) || byTime(a, b));
  function card(job: Job) { return <JobCard key={job.id} job={job} groupBadge={groupDayLabel(job, jobs)} busy={Boolean(busy) || pendingPayment} onDelete={() => setDeleting(job)} onSync={() => mutate(job, "sync")} onPayment={savePayment} />; }
  return <div className="workspace-layout calendar-layout">
    <header className="app-header"><div className="header-inner"><Brand /><AuthButton action="signOut" /></div></header>
    <AppNav active="calendar" />
    <main className="calendar-main">
      <div className="calendar-page-title"><div><p className="eyebrow muted">{t.workspace.eyebrow}</p><h1>{t.jobs.calendar}</h1></div><button type="button" className="button button-secondary" disabled={Boolean(busy) || refreshing || pendingPayment} onClick={() => void refresh()}>{refreshing ? t.workspace.checking : "รีเฟรช"}</button></div>
      {error && <div className="notice notice-error" role="alert">{error} <Link className="text-link" href="/settings">{t.jobs.settings}</Link></div>}
      {message && <div className="notice notice-feedback" role="status">{message}<button className="dismiss-notice" type="button" aria-label="ปิดข้อความ" onClick={() => setMessage("")}>×</button></div>}
      <div className="calendar-toolbar"><h2>{formatDay(anchor, { month: "long", year: "numeric" })}</h2><div className="view-tabs" role="group" aria-label="มุมมองปฏิทิน">{(["month", "week", "list"] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{t.jobs[item]}</button>)}</div><div className="date-navigation"><button type="button" className="button button-secondary" onClick={() => navigate(-1)}>{t.jobs.previous}</button><button type="button" className="button button-secondary" onClick={() => pick(today)}>{t.jobs.today}</button><button type="button" className="button button-secondary" onClick={() => navigate(1)}>{t.jobs.next}</button></div></div>
      {view === "list" ? <section className="job-list-view"><Link className="button button-primary" href={`/jobs/new?date=${selected}`}>+ {t.jobs.add}</Link>{monthly.length === 0 && <p className="empty-state">{t.jobs.emptyMonth}</p>}{[...new Set(monthly.map((job) => job.workDate))].map((date) => <section key={date} className="list-day"><div className="list-day-heading"><h2>{formatDay(date)}</h2><Link className="text-link" href={`/jobs/new?date=${date}`}>+ {t.jobs.add}</Link></div><div className="list-day-jobs">{monthly.filter((job) => job.workDate === date).map(card)}</div></section>)}</section> : <div className="calendar-content"><section className="calendar-surface" aria-label={view === "week" ? t.jobs.week : t.jobs.month}><CalendarGrid anchor={anchor} selected={selected} today={today} jobs={jobs} weekly={view === "week"} onSelect={pick} /><div className="calendar-legend"><span><i className="income-dot" />รายรับ</span><span><i className="expense-dot" />ค่าใช้จ่าย</span><span><i className="job-dot" />มีงาน</span></div><p className="calendar-hint">{t.jobs.pickDay}</p></section><section className="selected-day-panel" aria-labelledby="selected-day-title"><div className="selected-day-heading"><div><p>{formatDay(selected, { weekday: "long" })}</p><h2 id="selected-day-title">{formatDay(selected, { day: "numeric", month: "long" })}</h2></div><span className="job-count">{daily.length} งาน</span></div><Link className="button button-primary add-day-job" href={`/jobs/new?date=${selected}`}>+ {t.jobs.add}</Link>{daily.length ? daily.map(card) : <p className="empty-state">{t.jobs.empty}</p>}</section></div>}
    </main>
    {deleting && <DeleteJobDialog job={deleting} jobs={jobs} busy={Boolean(busy)} onClose={() => setDeleting(null)} onConfirm={(all) => void mutate(deleting, "delete", all)} />}
  </div>;
}
