"use client";

import { useState } from "react";
import { useAppRuntime } from "@/components/ui/app-runtime";
import { useLocalDraft } from "@/components/ui/use-local-draft";
import { Modal } from "@/components/ui/modal";
import { InputField } from "@/components/ui/form-field";
import { PaymentBadge } from "./payment-badge";
import { paymentStatuses, effectivePaymentStatus, unpaidAmount } from "@/lib/payments/logic";
import { paymentInputSchema, paymentAmountError, type PaymentInput } from "@/lib/payments/validation";
import { bangkokDate } from "@/lib/calculations";
import { formatMoney, t } from "@/lib/i18n";
import type { Job } from "@/types/job";

export type PaymentSave = (job: Job, input: PaymentInput) => Promise<Job>;
export function PaymentControl({ job, disabled = false, onSave }: { job: Job; disabled?: boolean; onSave: PaymentSave }) {
  const [editing, setEditing] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  return <div className="payment-control"><div className="payment-overview"><PaymentBadge job={job} /><span className="money-income">{t.payment.received} {formatMoney(job.paidAmount)}</span><span>{t.payment.unpaid} <strong className="money-income">{formatMoney(unpaidAmount(job))}</strong></span></div><button type="button" className="button button-secondary payment-edit-button" disabled={disabled || job.syncStatus === "delete_pending"} onClick={() => setEditing(job)}>{t.payment.edit}</button>{editing && <Modal title={t.payment.edit} busy={saving} onClose={() => setEditing(null)}><PaymentEditor job={editing} onSaving={setSaving} onSave={onSave} onClose={() => setEditing(null)} /></Modal>}</div>;
}
function PaymentEditor({ job, onSave, onClose, onSaving }: { job: Job; onSave: PaymentSave; onClose: () => void; onSaving: (value: boolean) => void }) {
  const { account } = useAppRuntime();
  const { value: input, setValue: setInput, ready, clear } = useLocalDraft<PaymentInput>(account ? `daily-work-log:${account}:payment-draft:${job.id}` : null, { paymentStatus: effectivePaymentStatus(job, bangkokDate()), paidAmount: job.paidAmount, paidDate: job.paidDate, updatedAt: job.updatedAt });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function changeStatus(value: PaymentInput["paymentStatus"]) {
    setInput((current) => value === "paid" ? { ...current, paymentStatus: value, paidAmount: job.income, paidDate: current.paidDate || bangkokDate() } : ["not_invoiced", "waiting_for_payment"].includes(value) ? { ...current, paymentStatus: value, paidAmount: 0, paidDate: "" } : { ...current, paymentStatus: value });
  }
  async function save() {
    const result = paymentInputSchema.safeParse(input);
    const amountError = paymentAmountError(input, job.income);
    if (!result.success || amountError) { setError(amountError || t.payment.invalid); return; }
    setBusy(true); onSaving(true); setError("");
    try { await onSave(job, result.data); clear(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t.payment.failed); }
    finally { setBusy(false); onSaving(false); }
  }
  return <div className="payment-editor" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (!busy && ready) void save(); } }}><p className="payment-client">{job.client} · <span className="money-income">{formatMoney(job.income)}</span></p><fieldset className="form-disabled-group" disabled={busy || !ready}><div className="payment-fields"><div className="form-field"><label htmlFor={`payment-status-${job.id}`}>{t.payment.status}</label><select id={`payment-status-${job.id}`} value={input.paymentStatus} onChange={(event) => changeStatus(event.target.value as PaymentInput["paymentStatus"])}>{paymentStatuses.map((status) => <option value={status} key={status}>{t.payment.statusLabels[status]}</option>)}</select></div><InputField id={`paid-amount-${job.id}`} label={t.payment.paidAmount} value={input.paidAmount} type="number" inputMode="decimal" min="0" max={job.income} step="0.01" className="money-income" onValue={(value) => setInput({ ...input, paidAmount: Number(value) })} /><InputField id={`paid-date-${job.id}`} label={t.payment.paidDate} type="date" value={input.paidDate} onValue={(value) => setInput({ ...input, paidDate: value })} /></div></fieldset><p className="field-help">{t.payment.dueRule}</p>{error && <p className="notice notice-error" role="alert">{error}</p>}<div className="contact-editor-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>{t.jobs.cancel}</button><button type="button" className="button button-primary" disabled={busy || !ready} onClick={() => void save()}>{busy ? t.payment.saving : t.payment.save}</button></div></div>;
}
