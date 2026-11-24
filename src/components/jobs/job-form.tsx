"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamPicker } from "@/components/contacts/team-picker";
import { CertificateSection } from "@/components/files/certificate-section";
import { useJobFiles } from "@/components/files/use-job-files";
import type { ContactHistory } from "@/types/contact";
import { JobPaymentPanel } from "./job-payment-panel";
import { WorkFields } from "./work-fields";
import { MoneyFields } from "./money-fields";
import { ExtraFields } from "./extra-fields";
import { useJobDraft } from "./use-job-draft";
import { jobInputSchema } from "@/lib/jobs/validation";
import { t } from "@/lib/i18n";
import type { Job, JobInput, JobMutation } from "@/types/job";

export function JobForm({ id, initial, clients, contacts, email, initialJob, editing = false }: { id: string; initial: JobInput; clients: string[]; contacts: ContactHistory[]; email: string; initialJob?: Job; editing?: boolean }) {
  const router = useRouter();
  const key = `daily-work-log:${email}:${editing ? id : "new"}`;
  const { draft, update, ready, message, dirty, clear, reset, advanceVersion } = useJobDraft(key, { id, input: initial });
  const files = useJobFiles(draft.id, ready);
  const [addingContact, setAddingContact] = useState(false);
  const [persistedJob, setPersistedJob] = useState(initialJob);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmEdit, setConfirmEdit] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (addingContact || paymentBusy) return;
    if (!jobInputSchema.safeParse(draft.input).success) { setError(t.jobs.invalid); return; }
    if (editing) setConfirmEdit(true);
    else void save();
  }
  async function save() {
    const input = jobInputSchema.safeParse(draft.input);
    if (!input.success) { setError(t.jobs.invalid); return; }
    setBusy(true); setError("");
    let committed = false;
    try {
      const response = await fetch(`/api/jobs/${draft.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      const data: JobMutation & { error?: string } = await response.json();
      if (!response.ok || !data.job) throw new Error(data.error || t.jobs.saveFailed);
      committed = true;
      setPersistedJob(data.job);
      update("baseUpdatedAt", data.job.updatedAt);
      await files.flush();
      clear();
      router.push(`/?date=${data.job.workDate}&notice=${data.warning ? "sync" : "saved"}`);
      router.refresh();
    } catch (reason) { setError(`${committed ? `${t.files.partial} ` : ""}${reason instanceof Error ? reason.message : t.jobs.saveFailed}`); setBusy(false); setConfirmEdit(false); }
  }
  function cancel() {
    if ((!dirty && !files.hasChanges) || window.confirm(files.hasChanges ? t.files.pendingLeave : t.jobs.leaveConfirm)) router.push(`/?date=${draft.input.workDate}`);
  }
  return <form className="job-form" onSubmit={submit} aria-busy={busy}>
    <div className="form-intro"><div><p className="eyebrow muted">{t.appName}</p><h1>{editing ? t.jobs.edit : t.jobs.add}</h1></div><button type="button" className="button button-quiet" disabled={busy || addingContact || paymentBusy} onClick={cancel}>{t.jobs.cancel}</button></div>
    <p className="draft-status" aria-live="polite">{ready ? message : "กำลังเปิดแบบฟอร์ม…"}</p>
    {persistedJob && <div className="form-payment-panel"><JobPaymentPanel key={persistedJob.updatedAt} job={persistedJob} disabled={busy || addingContact} onBusy={setPaymentBusy} onSaved={(saved, previous) => { setPersistedJob(saved); if (draft.input.baseUpdatedAt === previous.updatedAt) advanceVersion(saved.updatedAt); }} /></div>}
    <fieldset className="form-disabled-group" disabled={!ready || busy || paymentBusy}>
      <div className="job-form-columns"><div><WorkFields value={draft.input} update={update} clients={clients} /><TeamPicker initialContacts={contacts} selected={draft.input.teamMemberIds ?? []} onSelection={(ids) => update("teamMemberIds", ids)} onEditingChange={setAddingContact} /></div><div><MoneyFields value={draft.input} update={update} /><ExtraFields value={draft.input} update={update} /><CertificateSection jobId={draft.id} state={files} /></div></div>
    </fieldset>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="form-save-bar"><button type="button" className="button button-secondary" disabled={busy || addingContact || paymentBusy || (!dirty && !files.hasChanges)} onClick={() => { if (window.confirm(t.jobs.discardConfirm)) { reset(); files.reset(); } }}>{t.jobs.discard}</button><button type="submit" className="button button-primary" disabled={busy || addingContact || paymentBusy || !ready}>{busy ? t.jobs.saving : t.jobs.save}</button></div>
    {confirmEdit && <ConfirmDialog title="บันทึกการแก้ไขงานนี้หรือไม่?" description="ข้อมูลใน Google Sheets และกิจกรรม Google Calendar จะถูกอัปเดตตามแบบฟอร์มนี้" confirmLabel="ยืนยันบันทึก" busyLabel={t.jobs.saving} busy={busy} onClose={() => setConfirmEdit(false)} onConfirm={() => void save()} />}
  </form>;
}
