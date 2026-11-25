import { FormSection } from "@/components/ui/form-field";
import { TimeFields, AttendanceFields } from "./work-fields";
import { MoneyFields } from "./money-fields";
import { ExtraFields } from "./extra-fields";
import { PaymentFields } from "./payment-fields";
import { formatDay } from "@/lib/calendar";
import { addDays, sumMoney } from "@/lib/calculations";
import { formatMoney } from "@/lib/i18n";
import type { JobInput } from "@/types/job";
import type { DayOverride, DayPayment } from "@/lib/jobs/multi-day";

type Day = { id: string; input: JobInput; payment?: DayPayment };
export function SelectedDayFields({ days, overrides, lastDate, payAfterLast, open, onOpen, onChange, onReset }: { days: Day[]; overrides: Record<string, DayOverride>; lastDate: string; payAfterLast: boolean; open: string; onOpen: (date: string) => void; onChange: (date: string, value: DayOverride) => void; onReset: (date: string) => void }) {
  return <FormSection title="รายละเอียดแต่ละวัน"><p className="field-help">แตะวันเพื่อแก้เฉพาะวันนั้น รายรับและค่าใช้จ่ายรวมด้านล่างคิดจากทุกรายการ</p>{days.map(({ id, input, payment }, index) => {
    const date = input.workDate;
    const prefix = date + "-";
    const due = Number.isInteger(input.creditDays) && input.creditDays >= 0 && input.creditDays <= 3650 ? addDays(payAfterLast ? lastDate : date, input.creditDays) : "";
    const update = <K extends keyof JobInput>(key: K, value: JobInput[K]) => onChange(date, { [key]: value });
    return <section className="selected-job-day" key={id}><button type="button" className="selected-day-toggle" aria-expanded={open === date} aria-controls={prefix + "editor"} onClick={() => onOpen(open === date ? "" : date)}><span><strong>{formatDay(date, { day: "numeric", month: "short", year: "numeric" })}</strong><small>วันที่ {index + 1}/{days.length} · {input.startTime}–{input.endTime}{overrides[date] ? " · แก้เฉพาะวัน" : ""}</small></span><span className="money-income">{formatMoney(input.income)} {open === date ? "−" : "+"}</span></button>
      <p className="day-summary"><span className="money-expense">ค่าใช้จ่าย {formatMoney(sumMoney(input.expenses.map((item) => item.amount)))}</span><span>รับเงิน {due ? formatDay(due, { day: "numeric", month: "short" }) : "กรุณาตรวจเครดิต"}</span></p>
      {open === date && <div id={prefix + "editor"} className="selected-day-editor"><TimeFields value={input} update={update} prefix={prefix} /><AttendanceFields value={input} update={update} prefix={prefix} /><MoneyFields value={input} update={update} prefix={prefix} hideCredit paymentBaseDate={payAfterLast ? lastDate : date} /><ExtraFields value={input} update={update} prefix={prefix} /><PaymentFields prefix={prefix + "payment-"} income={input.income} value={payment || { paymentStatus: "not_invoiced", paidAmount: 0, paidDate: "" }} onChange={(value) => onChange(date, { payment: value })} /><button type="button" className="button button-secondary" onClick={() => onReset(date)}>คืนค่าเริ่มต้นของวันนี้</button></div>}
    </section>;
  })}</FormSection>;
}
