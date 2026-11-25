import { InputField } from "@/components/ui/form-field";
import { paymentStatuses } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import { t } from "@/lib/i18n";
import type { DayPayment } from "@/lib/jobs/multi-day";

export function PaymentFields({ value, onChange, income, prefix }: { value: DayPayment; onChange: (value: DayPayment) => void; income: number; prefix: string }) {
  function status(paymentStatus: DayPayment["paymentStatus"]) {
    onChange(paymentStatus === "paid" ? { paymentStatus, paidAmount: income, paidDate: value.paidDate || bangkokDate() } : ["not_invoiced", "waiting_for_payment"].includes(paymentStatus) ? { paymentStatus, paidAmount: 0, paidDate: "" } : { ...value, paymentStatus });
  }
  return <div className="payment-fields"><div className="form-field"><label htmlFor={prefix + "status"}>{t.payment.status}</label><select id={prefix + "status"} value={value.paymentStatus} onChange={(event) => status(event.target.value as DayPayment["paymentStatus"])}>{paymentStatuses.map((item) => <option value={item} key={item}>{t.payment.statusLabels[item]}</option>)}</select></div><InputField id={prefix + "amount"} label={t.payment.paidAmount} value={value.paidAmount} type="number" inputMode="decimal" min="0" max={income} step="0.01" className="money-income" onValue={(amount) => onChange({ ...value, paidAmount: Number(amount) })} /><InputField id={prefix + "date"} label={t.payment.paidDate} type="date" value={value.paidDate} onValue={(paidDate) => onChange({ ...value, paidDate })} /></div>;
}
