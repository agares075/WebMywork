import { paymentTotals } from "@/lib/payments/logic";
import { formatDay, monthDays, weekDays } from "@/lib/calendar";
import { formatMoney, t } from "@/lib/i18n";
import type { Job } from "@/types/job";

export function CalendarGrid({ anchor, selected, today, jobs, weekly, onSelect }: { anchor: string; selected: string; today: string; jobs: Job[]; weekly: boolean; onSelect: (date: string) => void }) {
  const dates = weekly ? weekDays(anchor) : monthDays(anchor);
  return <div className={`calendar-grid ${weekly ? "week-grid" : ""}`}>
    {t.jobs.weekdays.map((day) => <div className="weekday" key={day}>{day}</div>)}
    {dates.map((date) => {
      const entries = jobs.filter((job) => job.workDate === date && job.syncStatus !== "delete_pending");
      const totals = paymentTotals(entries);
      return <button key={date} type="button" className={`calendar-day ${date.slice(0, 7) !== anchor.slice(0, 7) && !weekly ? "other-month" : ""} ${date === selected ? "selected-day" : ""} ${date === today ? "today-day" : ""}`} onClick={() => onSelect(date)} aria-pressed={date === selected} aria-label={`${formatDay(date)} ${entries.length} งาน ${t.jobs.net} ${formatMoney(totals.net)}`} aria-current={date === today ? "date" : undefined}>
        <span className="day-number">{Number(date.slice(-2))}</span>
        {entries.length > 0 && <><span className="day-dots" aria-hidden="true">{totals.income > 0 && <span className="income-dot" />}{totals.expenses > 0 && <span className="expense-dot" />}{totals.income === 0 && totals.expenses === 0 && <span className="job-dot" />}</span><span className={`day-net ${totals.net >= 0 ? "money-income" : "money-expense"}`}>{new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(totals.net)}</span></>}
      </button>;
    })}
  </div>;
}
