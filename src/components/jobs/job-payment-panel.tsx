"use client";

import { PaymentControl } from "./payment-control";
import { useLiveJobs } from "./use-live-jobs";
import { FormSection } from "@/components/ui/form-field";
import { t } from "@/lib/i18n";
import type { Job } from "@/types/job";

export function JobPaymentPanel({ job, disabled, onSaved, onBusy }: { job: Job; disabled: boolean; onSaved: (saved: Job, previous: Job) => void; onBusy: (value: boolean) => void }) {
  const live = useLiveJobs([job], disabled);
  const current = live.jobs.find((value) => value.id === job.id);
  return <FormSection title={t.payment.title}>{live.error && <p className="notice notice-error" role="alert">{live.error}</p>}{current ? <PaymentControl job={current} disabled={disabled || live.pendingPayment} onSave={async (previous, input) => { onBusy(true); try { const saved = await live.savePayment(previous, input); onSaved(saved, previous); return saved; } finally { onBusy(false); } }} /> : <p>{t.jobs.notFound}</p>}</FormSection>;
}
