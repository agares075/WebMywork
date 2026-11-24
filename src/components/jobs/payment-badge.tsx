import { effectivePaymentStatus } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import { t } from "@/lib/i18n";
import type { Job } from "@/types/job";

export function PaymentBadge({ job }: { job: Pick<Job, "income" | "paymentStatus" | "paidAmount" | "expectedPaymentDate"> }) {
  const status = effectivePaymentStatus(job, bangkokDate());
  return <span className={`payment-badge payment-${status}`}>{t.payment.statusLabels[status]}</span>;
}
