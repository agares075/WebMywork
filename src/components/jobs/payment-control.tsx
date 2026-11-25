"use client";

import { useState } from "react";
import { useAppRuntime } from "@/components/ui/app-runtime";
import { useLocalDraft } from "@/components/ui/use-local-draft";
import { Modal } from "@/components/ui/modal";
import { PaymentFields } from "./payment-fields";
import { PaymentBadge } from "./payment-badge";
import { effectivePaymentStatus, unpaidAmount } from "@/lib/payments/logic";
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
  async function save() {
    const result = paymentInputSchema.safeParse(input);
    const amountError = paymentAmountError(input, job.income);
    if (!result.success || amountError) { setError(amountError || t.payment.invalid); return; }
    setBusy(true); onSaving(true); setError("");
    try { await onSave(job, result.data); clear(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t.payment.failed); }
    finally { setBusy(false); onSaving(false); }
  }
  return <div className="payment-editor" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (!busy && ready) void save(); } }}><p className="payment-client">{job.client} · <span className="money-income">{formatMoney(job.income)}</span></p><fieldset className="form-disabled-group" disabled={busy || !ready}><PaymentFields value={input} income={job.income} prefix={`payment-${job.id}-`} onChange={(value) => setInput({ ...input, ...value })} /></fieldset><p className="field-help">{t.payment.dueRule}</p>{error && <p className="notice notice-error" role="alert">{error}</p>}<div className="contact-editor-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>{t.jobs.cancel}</button><button type="button" className="button button-primary" disabled={busy || !ready} onClick={() => void save()}>{busy ? t.payment.saving : t.payment.save}</button></div></div>;
}
