import { formatMoney, t } from "@/lib/i18n";
import { formatDay } from "@/lib/calendar";
import type { chartMonths } from "@/lib/reports/logic";

export function IncomeChart({ points }: { points: ReturnType<typeof chartMonths> }) {
  const maximum = Math.max(1, ...points.flatMap((point) => [point.income, point.expenses]));
  return <figure className="income-chart"><figcaption><h2>{t.reports.chart}</h2><p>{t.reports.chartPeriod}</p></figcaption><div className="chart-legend"><span className="money-income"><i className="income-dot" />{t.reports.income}</span><span className="money-expense"><i className="expense-dot" />{t.reports.expenses}</span></div><div className="chart-rows">{points.map((point) => <div className="chart-row" key={point.month}><time dateTime={point.month}>{formatDay(`${point.month}-01`, { month: "short", year: "2-digit" })}</time><div className="chart-pair">{(["income", "expenses"] as const).map((kind) => <div className="chart-bar-line" key={kind} aria-label={`${kind === "income" ? t.reports.income : t.reports.expenses} ${formatMoney(point[kind])}`}><div className="chart-track" aria-hidden="true"><div className={`chart-bar chart-${kind}`} style={{ width: `${point[kind] / maximum * 100}%` }} /></div><span className={kind === "income" ? "money-income" : "money-expense"}>{formatMoney(point[kind])}</span></div>)}</div></div>)}</div>{points.every((point) => point.income === 0 && point.expenses === 0) && <p className="field-help">{t.reports.emptyChart}</p>}<p className="field-help">{t.reports.chartHint}</p></figure>;
}
