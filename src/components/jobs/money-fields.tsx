import { FormSection, InputField } from "@/components/ui/form-field";
import { addDays, bangkokDate, paymentCountdown, sumMoney } from "@/lib/calculations";
import { formatMoney, t } from "@/lib/i18n";
import type { JobFieldsProps } from "./work-fields";

export function MoneyFields({ value, update }: JobFieldsProps) {
  const total = sumMoney(value.expenses.map((item) => item.amount));
  const expected = /^\d{4}-\d{2}-\d{2}$/.test(value.workDate) && Number.isInteger(value.creditDays) && value.creditDays >= 0 && value.creditDays <= 3650 && !Number.isNaN(new Date(`${value.workDate}T00:00:00Z`).valueOf()) ? addDays(value.workDate, value.creditDays || 0) : "";
  return <FormSection title={t.jobs.sectionMoney}>
    <InputField id="income" label={t.jobs.income} type="number" inputMode="decimal" min="0" max="999999999.99" step="0.01" className="money-income" value={value.income} onValue={(v) => update("income", Number(v))} required />
    <div className="expense-heading"><h3>{t.jobs.expenses}</h3><span className="money-expense">{formatMoney(total)}</span></div>
    {value.expenses.map((expense, index) => <div className="expense-item" key={expense.id}>
      <InputField id={`expense-label-${expense.id}`} label={`${t.jobs.expenseLabel} ${index + 1}`} value={expense.label} required maxLength={200} onValue={(label) => update("expenses", value.expenses.map((item) => item.id === expense.id ? { ...item, label } : item))} />
      <div className="expense-amount"><InputField id={`expense-amount-${expense.id}`} label={t.jobs.amount} type="number" inputMode="decimal" min="0" max="999999999.99" step="0.01" value={expense.amount} className="money-expense" onValue={(v) => update("expenses", value.expenses.map((item) => item.id === expense.id ? { ...item, amount: Number(v) } : item))} required /><button type="button" className="button button-quiet delete-text" onClick={() => update("expenses", value.expenses.filter((item) => item.id !== expense.id))} aria-label={`${t.jobs.remove} ${index + 1}`}>{t.jobs.remove}</button></div>
    </div>)}
    <button type="button" className="button button-secondary" disabled={value.expenses.length >= 50} onClick={() => update("expenses", [...value.expenses, { id: crypto.randomUUID(), label: "", amount: 0 }])}>+ {t.jobs.addExpense}</button>
    <p className="calculated-value money-expense">{t.jobs.expenseTotal}<strong>{formatMoney(total)}</strong></p>
    <p className={`calculated-value ${value.income - total >= 0 ? "money-income" : "money-expense"}`}>{t.jobs.net}<strong>{formatMoney(sumMoney([value.income, -total]))}</strong></p>
    <InputField id="credit-days" label={t.jobs.creditDays} type="number" inputMode="numeric" min="0" max="3650" step="1" required value={value.creditDays} onValue={(v) => update("creditDays", Number(v))} />
    {expected && <div className="expected-payment"><span>{t.jobs.expected}</span><strong>{new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${expected}T00:00:00Z`))}</strong><span>{paymentCountdown(expected, bangkokDate())}</span></div>}
    <label className="checkbox-field"><input type="checkbox" checked={value.reminderEnabled} onChange={(event) => update("reminderEnabled", event.target.checked)} /><span>{t.jobs.reminder}</span></label>
  </FormSection>;
}
