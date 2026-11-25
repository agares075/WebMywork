"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppRuntime, useErrorToast } from "@/components/ui/app-runtime";
import { FormSection, InputField } from "@/components/ui/form-field";
import { TeamPicker } from "@/components/contacts/team-picker";
import { CertificateSection } from "@/components/files/certificate-section";
import { useJobFiles } from "@/components/files/use-job-files";
import { WorkFields } from "./work-fields";
import { MoneyFields } from "./money-fields";
import { ExtraFields } from "./extra-fields";
import { MultiDatePicker } from "./multi-date-picker";
import { SelectedDayFields } from "./selected-day-fields";
import { useMultiDayDraft } from "./use-multi-day-draft";
import { expandDays, type DayOverride } from "@/lib/jobs/multi-day";
import { groupInputSchema } from "@/lib/jobs/group-validation";
import { buildJob } from "@/lib/sheets/job-mapping";
import { formatDay } from "@/lib/calendar";
import { addDays, sumMoney } from "@/lib/calculations";
import { paymentAmountError } from "@/lib/payments/validation";
import { formatMoney, t } from "@/lib/i18n";
import { queuedRequests } from "@/lib/offline/store";
import type { JobInput } from "@/types/job";
import type { ContactHistory } from "@/types/contact";

export function MultiDayJobForm({ id, initial, clients, contacts, email }: { id: string; initial: JobInput; clients: string[]; contacts: ContactHistory[]; email: string }) {
  const router = useRouter();
  const { mutate, notify } = useAppRuntime();
  const { value: draft, setValue, ready, clear } = useMultiDayDraft(email, id, initial);
  const files = useJobFiles(draft.id, ready);
  const [addingContact, setAddingContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState("");
  useErrorToast(error);
  let selectionError = "";
  let days: ReturnType<typeof expandDays> = [];
  try { days = expandDays(draft); } catch (reason) { selectionError = (reason as Error).message; }
  const lastDate = days.at(-1)?.input.workDate || draft.common.workDate;
  const income = sumMoney(days.map((day) => day.input.income));
  const expenses = sumMoney(days.flatMap((day) => day.input.expenses.map((item) => item.amount)));
  function resetIncome() {
    setValue((current) => ({ ...current, overrides: Object.fromEntries(Object.entries(current.overrides).map(([date, value]) => { const { income: _income, ...rest } = value; void _income; return [date, rest]; })) }));
  }
  function update<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setValue((current) => ({ ...current, common: { ...current.common, [key]: value } }));
    if (key === "income") resetIncome();
  }
  function dayChange(date: string, value: DayOverride) {
    setValue((current) => ({ ...current, overrides: { ...current.overrides, [date]: { ...current.overrides[date], ...value } } }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || addingContact || files.processing) return;
    setError("");
    const parsed = groupInputSchema.safeParse({ days, payAfterLast: draft.payAfterLast });
    const paymentError = days.map((day) => ({ date: day.input.workDate, message: day.payment ? paymentAmountError(day.payment, day.input.income) : "" })).find((value) => value.message);
    const pending = queuedRequests(email).some((entry) => entry.entity === `group:${draft.id}`);
    const shouldSave = !draft.submitted || (!draft.confirmed && !pending);
    if (shouldSave && (!parsed.success || selectionError || paymentError)) {
      const issue = !parsed.success ? parsed.error.issues[0] : undefined;
      const date = paymentError?.date || (typeof issue?.path[1] === "number" ? days[issue.path[1]]?.input.workDate : "");
      if (date) setOpen(date);
      setError(selectionError || `${date ? formatDay(date) + ": " : ""}${paymentError?.message || issue?.message || t.jobs.invalid}`);
      return;
    }
    setBusy(true);
    try {
      let queued = false;
      let warning = "";
      if (shouldSave && parsed.success) {
        const optimistic = parsed.data.days.map((day) => {
          const job = buildJob(day.id, day.input);
          const paymentBaseDate = draft.payAfterLast ? lastDate : "";
          return { ...job, ...day.payment, jobGroupId: draft.id, paymentBaseDate, expectedPaymentDate: addDays(paymentBaseDate || job.workDate, job.creditDays) };
        });
        const data = await mutate({ url: `/api/jobs/groups/${draft.id}`, method: "PUT", entity: `group:${draft.id}`, label: `งาน ${days.length} วัน: ${draft.common.client}`, json: { ...parsed.data }, optimistic: { jobs: optimistic } });
        queued = Boolean(data.queued);
        warning = data.warning || "";
        setValue((current) => ({ ...current, submitted: true, confirmed: !data.queued }));
      }
      queued = await files.flush() || queued || queuedRequests(email).some((entry) => entry.entity === `group:${draft.id}`);
      if (queued) { notify("เก็บทุกวันไว้รอส่งแล้ว เปิดเว็บไซต์เมื่อออนไลน์เพื่อซิงก์ต่อ"); return; }
      clear();
      router.push(`/?date=${days[0]?.input.workDate || initial.workDate}&notice=${warning ? "sync" : "saved"}`);
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.jobs.saveFailed); }
    finally { setBusy(false); }
  }
  function leave() {
    if (draft.submitted || window.confirm(files.hasChanges ? t.files.pendingLeave : t.jobs.leaveConfirm)) router.push(`/?date=${days[0]?.input.workDate || initial.workDate}`);
  }
  return <form className="job-form" onSubmit={save} aria-busy={busy}>
    <div className="form-intro"><div><p className="eyebrow muted">{t.appName}</p><h1>{t.jobs.add}</h1></div><button type="button" className="button button-quiet" disabled={busy || addingContact || files.processing} onClick={leave}>{t.jobs.cancel}</button></div>
    <p className="draft-status" aria-live="polite">{!ready ? "กำลังเปิดแบบฟอร์ม…" : draft.submitted ? "ส่งรายการแล้ว หรืออยู่ในคิวรอซิงก์ · แก้ไขแต่ละวันได้จากปฏิทินหลังซิงก์" : "เก็บฉบับร่างทุกวันอัตโนมัติในอุปกรณ์นี้"}</p>
    <fieldset className="form-disabled-group" disabled={!ready || busy || draft.submitted}>
      <MultiDatePicker key={ready ? draft.id : "loading"} value={draft} onChange={(value) => setValue((current) => ({ ...current, ...value }))} />
      <p className="field-help">กรอกข้อมูลร่วมครั้งเดียว แต่ละวันที่เลือกจะบันทึกเป็นงานแยกกันในกลุ่มเดียว</p>
      <div className="job-form-columns"><div><WorkFields value={draft.common} update={update} clients={clients} hideDate hideAttendance /><TeamPicker initialContacts={contacts} selected={draft.common.teamMemberIds || []} onSelection={(ids) => update("teamMemberIds", ids)} onEditingChange={setAddingContact} /><ExtraFields value={draft.common} update={update} /><button type="button" className="button button-secondary" onClick={() => { if (window.confirm("ใช้เวลาเริ่ม–จบ ชุด และรองเท้าด้านบนกับทุกวันที่เลือก?")) setValue((current) => ({ ...current, overrides: Object.fromEntries(Object.entries(current.overrides).map(([date, value]) => [date, { ...value, startTime: current.common.startTime, endTime: current.common.endTime, outfit: current.common.outfit, shoes: current.common.shoes }])) })); }}>ใช้เวลา ชุด และรองเท้ากับทุกวัน</button></div>
      <div><FormSection title="วิธีกรอกรายรับ"><div className="view-tabs" role="group" aria-label="วิธีกรอกรายรับ">{(["per_day", "total"] as const).map((mode) => <button type="button" key={mode} aria-pressed={draft.incomeMode === mode} onClick={() => { setValue((current) => ({ ...current, incomeMode: mode })); resetIncome(); }}>{mode === "per_day" ? "จำนวนต่อวัน" : "ยอดรวมแบ่งเท่ากัน"}</button>)}</div>{draft.incomeMode === "total" && <InputField id="total-income" label="รายรับรวมทุกวัน (฿)" type="number" inputMode="decimal" min="0" max="999999999.99" step="0.01" required className="money-income" value={draft.totalIncome} onValue={(value) => { setValue((current) => ({ ...current, totalIncome: Number(value) })); resetIncome(); }} />}<p className="field-help">เศษสตางค์จะจัดให้วันแรกตามลำดับ แก้รายรับเฉพาะวันได้ด้านล่าง (ยอดรวมจะเปลี่ยนตามที่แก้)</p></FormSection>
      <MoneyFields value={draft.incomeMode === "total" ? { ...draft.common, income: days[0]?.input.income || 0 } : draft.common} update={update} hideIncome={draft.incomeMode === "total"} paymentBaseDate={draft.payAfterLast ? lastDate : days[0]?.input.workDate} />
      <label className="checkbox-field group-payment-option"><input type="checkbox" checked={draft.payAfterLast} onChange={(event) => setValue((current) => ({ ...current, payAfterLast: event.target.checked }))} /><span>รับเงินครั้งเดียวหลังวันสุดท้าย (วันสุดท้าย + เครดิตของแต่ละวัน)</span></label><p className="field-help">ค่าใช้จ่ายด้านบนเป็นค่าเริ่มต้นต่อวัน</p></div></div>
      {days.length > 0 ? <SelectedDayFields days={days} overrides={draft.overrides} lastDate={lastDate} payAfterLast={draft.payAfterLast} open={open} onOpen={setOpen} onChange={dayChange} onReset={(date) => setValue((current) => ({ ...current, overrides: Object.fromEntries(Object.entries(current.overrides).filter(([key]) => key !== date)) }))} /> : <p className="notice" role="status">{selectionError}</p>}
    </fieldset>
    <fieldset className="form-disabled-group" disabled={!ready || busy}><p className="field-help">เอกสารที่เพิ่มที่นี่แนบกับวันแรก แก้เอกสารของวันอื่นได้จากงานวันนั้นในปฏิทิน</p><CertificateSection jobId={draft.id} state={files} /></fieldset>
    <div className="multi-day-totals" aria-live="polite"><strong>{days.length} วัน</strong><span className="money-income">รายรับรวม {formatMoney(income)}</span><span className="money-expense">ค่าใช้จ่ายรวม {formatMoney(expenses)}</span></div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="form-save-bar"><button type="button" className="button button-secondary" disabled={busy || addingContact || files.processing} onClick={leave}>กลับปฏิทิน</button><button type="submit" className="button button-primary" disabled={!ready || busy || addingContact || files.processing}>{busy ? t.jobs.saving : draft.submitted ? "เสร็จสิ้น / ส่งเอกสารที่ค้าง" : `บันทึก ${days.length} วัน`}</button></div>
  </form>;
}
