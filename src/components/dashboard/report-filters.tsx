import { outfits } from "@/lib/jobs/validation";
import { paymentStatuses } from "@/lib/payments/logic";
import { formatDay } from "@/lib/calendar";
import { t } from "@/lib/i18n";
import type { ReportFilters } from "@/lib/reports/logic";
import type { Job } from "@/types/job";

export function ReportFilterFields({ filters, onChange, jobs, currentMonth }: { filters: ReportFilters; onChange: (value: ReportFilters) => void; jobs: Job[]; currentMonth: string }) {
  const months = [...new Set([currentMonth, ...jobs.map((job) => job.workDate.slice(0, 7))])].sort().reverse();
  const clients = [...new Set(jobs.map((job) => job.client))].sort((a, b) => a.localeCompare(b, "th"));
  return <section className="report-filters" aria-label="ตัวกรองรายงาน"><div className="report-filter-grid">
    <div className="form-field"><label htmlFor="report-month">{t.reports.month}</label><select id="report-month" value={filters.month} onChange={(event) => onChange({ ...filters, month: event.target.value })}><option value="">{t.reports.allMonths}</option>{months.map((month) => <option key={month} value={month}>{formatDay(`${month}-01`, { month: "long", year: "numeric" })}</option>)}</select></div>
    <div className="form-field"><label htmlFor="report-client">{t.reports.client}</label><select id="report-client" value={filters.client} onChange={(event) => onChange({ ...filters, client: event.target.value })}><option value="">{t.reports.all}</option>{clients.map((client) => <option key={client}>{client}</option>)}</select></div>
    <div className="form-field"><label htmlFor="report-status">{t.reports.status}</label><select id="report-status" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}><option value="">{t.reports.all}</option>{paymentStatuses.map((status) => <option key={status} value={status}>{t.payment.statusLabels[status]}</option>)}</select></div>
    <div className="form-field"><label htmlFor="report-outfit">{t.reports.outfit}</label><select id="report-outfit" value={filters.outfit} onChange={(event) => onChange({ ...filters, outfit: event.target.value })}><option value="">{t.reports.all}</option>{outfits.map((outfit) => <option key={outfit}>{outfit}</option>)}</select></div>
  </div><div className="report-filter-footer"><p>{t.reports.monthHint}</p><button type="button" className="button button-quiet" onClick={() => onChange({ month: currentMonth, client: "", status: "", outfit: "" })}>{t.reports.reset}</button></div></section>;
}
