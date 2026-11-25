"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppRuntime, useErrorToast } from "@/components/ui/app-runtime";
import { buildJob } from "@/lib/sheets/job-mapping";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamPicker } from "@/components/contacts/team-picker";
import { CertificateSection } from "@/components/files/certificate-section";
import { useJobFiles } from "@/components/files/use-job-files";
import type { ContactHistory } from "@/types/contact";
import { JobPaymentPanel } from "./job-payment-panel";
import { applyGroupChanges, type DayPayment } from "@/lib/jobs/multi-day";
import { groupInputSchema } from "@/lib/jobs/group-validation";
import { useGroupEdit } from "./use-group-edit";
import { GroupScope } from "./group-scope";
import { PaymentFields } from "./payment-fields";
import { FormSection } from "@/components/ui/form-field";
import { WorkFields } from "./work-fields";
import { MoneyFields } from "./money-fields";
import { ExtraFields } from "./extra-fields";
import { useJobDraft } from "./use-job-draft";
import { jobInputSchema } from "@/lib/jobs/validation";
import { t } from "@/lib/i18n";
import type { Job, JobInput } from "@/types/job";

export function JobForm({ id, initial, clients, contacts, email, initialJob, groupJobs = [] }: { id: string; initial: JobInput; clients: string[]; contacts: ContactHistory[]; email: string; initialJob?: Job; groupJobs?: Job[] }) {
  const router = useRouter();
  const { mutate, notify } = useAppRuntime();
  const key = `daily-work-log:${email}:${id}`;
  const { draft, update, ready, message, dirty, clear, reset, advanceVersion } = useJobDraft(key, { id, input: initial });
  const files = useJobFiles(draft.id, ready);
  const [addingContact, setAddingContact] = useState(false);
  const { persistedJob, setPersistedJob, members, setGroupRows, allDays, setAllDays, groupPayment, setGroupPayment, clearSettings, settingsReady } = useGroupEdit(id, initialJob, groupJobs, email);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmEdit, setConfirmEdit] = useState(false);
  useErrorToast(error);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (addingContact || paymentBusy || files.processing) return;
    if (!jobInputSchema.safeParse(draft.input).success) { setError(t.jobs.invalid); return; }
    setConfirmEdit(true);
  }
  async function save() {
    const input = jobInputSchema.safeParse(draft.input);
    if (!input.success) { setError(t.jobs.invalid); return; }
    setBusy(true); setError("");
    let committed = false;
    try {
      let saved: Job | undefined;
      let queued = false;
      let warning = "";
      if (allDays && persistedJob?.jobGroupId) {
        const days = applyGroupChanges(persistedJob, input.data, members).map((day) => ({ ...day, ...(groupPayment ? { payment: { ...groupPayment, paidAmount: groupPayment.paymentStatus === "paid" ? day.input.income : groupPayment.paidAmount } } : {}) }));
        const parsed = groupInputSchema.safeParse({ days });
        if (!parsed.success) throw new Error(t.jobs.invalid);
        const optimistic = days.map((day) => ({ ...buildJob(day.id, day.input, members.find((job) => job.id === day.id)), ...day.payment }));
        const data = await mutate({ url: `/api/jobs/groups/${persistedJob.jobGroupId}`, method: "PUT", entity: `group:${persistedJob.jobGroupId}`, label: `แก้ทั้งกลุ่ม: ${input.data.client}`, json: { ...parsed.data }, optimistic: { jobs: optimistic } });
        saved = data.jobs?.find((job) => job.id === draft.id);
        if (data.jobs) setGroupRows(data.jobs);
        queued = Boolean(data.queued); warning = data.warning || "";
      } else {
        const optimistic = buildJob(draft.id, input.data, persistedJob);
        const data = await mutate({ url: `/api/jobs/${draft.id}`, method: "PUT", entity: `job:${draft.id}`, label: `งาน: ${input.data.client}`, json: { ...input.data }, optimistic: { job: optimistic }, ...(persistedJob ? { base: { ...persistedJob } } : {}), localVersion: optimistic.updatedAt });
        saved = data.job; queued = Boolean(data.queued); warning = data.warning || "";
      }
      if (!saved) throw new Error(t.jobs.saveFailed);
      committed = true;
      setPersistedJob(saved);
      update("baseUpdatedAt", saved.updatedAt);
      const filesQueued = await files.flush();
      if (queued || filesQueued) { setBusy(false); setConfirmEdit(false); notify("เก็บรายการรอส่งแล้ว เปิดเว็บไซต์อีกครั้งเมื่อออนไลน์เพื่อส่งต่อ"); return; }
      clear(); clearSettings();
      router.push(`/?date=${saved.workDate}&notice=${warning ? "sync" : "saved"}`);
      router.refresh();
    } catch (reason) { setError(`${committed ? `${t.files.partial} ` : ""}${reason instanceof Error ? reason.message : t.jobs.saveFailed}`); setBusy(false); setConfirmEdit(false); }
  }
  function cancel() {
    if ((!dirty && !files.hasChanges) || window.confirm(files.hasChanges ? t.files.pendingLeave : t.jobs.leaveConfirm)) router.push(`/?date=${draft.input.workDate}`);
  }
  return <form className="job-form" onSubmit={submit} aria-busy={busy}>
    <div className="form-intro"><div><p className="eyebrow muted">{t.appName}</p><h1>{t.jobs.edit}</h1></div><button type="button" className="button button-quiet" disabled={busy || addingContact || paymentBusy || files.processing} onClick={cancel}>{t.jobs.cancel}</button></div>
    <p className="draft-status" aria-live="polite">{ready ? message : "กำลังเปิดแบบฟอร์ม…"}</p>
    {persistedJob?.jobGroupId && <fieldset className="form-disabled-group" disabled={busy || paymentBusy || !ready}><GroupScope job={persistedJob} members={members} all={allDays} onChange={(value) => { setAllDays(value); if (value) update("workDate", persistedJob.workDate); }} />{allDays && <FormSection title="การชำระเงินทั้งกลุ่ม"><label className="checkbox-field"><input type="checkbox" checked={Boolean(groupPayment)} onChange={(event) => setGroupPayment(event.target.checked ? { paymentStatus: persistedJob.paymentStatus as DayPayment["paymentStatus"], paidAmount: persistedJob.paidAmount, paidDate: persistedJob.paidDate } : null)} /><span>ใช้สถานะ ยอดรับแล้ว และวันที่รับเงินกับทุกวัน</span></label>{groupPayment && <PaymentFields value={groupPayment} onChange={setGroupPayment} income={draft.input.income} prefix="group-payment-" />}<p className="field-help">สถานะชำระแล้วจะรับเงินเต็มรายรับของแต่ละวัน ยอดชำระบางส่วนต้องไม่เกินรายรับของวันนั้น</p></FormSection>}</fieldset>}
    {persistedJob && !allDays && <div className="form-payment-panel"><JobPaymentPanel key={persistedJob.updatedAt} job={persistedJob} disabled={busy || addingContact} onBusy={setPaymentBusy} onSaved={(saved, previous) => { setPersistedJob(saved); if (draft.input.baseUpdatedAt === previous.updatedAt) advanceVersion(saved.updatedAt); }} /></div>}
    <fieldset className="form-disabled-group" disabled={!ready || !settingsReady || busy || paymentBusy}>
      <div className="job-form-columns"><div><WorkFields value={draft.input} update={update} clients={clients} disableDate={allDays} /><TeamPicker initialContacts={contacts} selected={draft.input.teamMemberIds ?? []} onSelection={(ids) => update("teamMemberIds", ids)} onEditingChange={setAddingContact} /></div><div><MoneyFields value={draft.input} update={update} paymentBaseDate={persistedJob?.paymentBaseDate} /><ExtraFields value={draft.input} update={update} /><CertificateSection jobId={draft.id} state={files} /></div></div>
    </fieldset>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="form-save-bar"><button type="button" className="button button-secondary" disabled={busy || addingContact || paymentBusy || files.processing || (!dirty && !files.hasChanges)} onClick={() => { if (window.confirm(t.jobs.discardConfirm)) { reset(); clearSettings(); setAllDays(false); setGroupPayment(null); files.reset(); } }}>{t.jobs.discard}</button><button type="submit" className="button button-primary" disabled={busy || addingContact || paymentBusy || files.processing || !ready || !settingsReady}>{busy ? t.jobs.saving : t.jobs.save}</button></div>
    {confirmEdit && <ConfirmDialog title={allDays ? `บันทึกการแก้ไขทั้ง ${members.length} วันหรือไม่?` : "บันทึกการแก้ไขวันนี้หรือไม่?"} description={allDays ? "ช่องที่แก้จะใช้กับทุกวันในกลุ่ม และอัปเดตกิจกรรม Google Calendar ของวันนั้น" : "ข้อมูลและกิจกรรม Google Calendar ของวันนี้จะถูกอัปเดต"} confirmLabel="ยืนยันบันทึก" busyLabel={t.jobs.saving} busy={busy} onClose={() => setConfirmEdit(false)} onConfirm={() => void save()} />}
  </form>;
}
