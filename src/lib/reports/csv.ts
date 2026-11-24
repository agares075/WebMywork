import "server-only";
import { sheetHeaders } from "@/lib/sheets/schema";
import { jobToRow } from "@/lib/sheets/job-mapping";
import { paymentTotals } from "@/lib/payments/logic";
import { sumMoney } from "@/lib/calculations";
import type { Job } from "@/types/job";

function cell(value: string | number | boolean): string {
  let text = String(value);
  // Excel must treat client names, notes, and other free text as text.
  if (typeof value === "string" && (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function jobsCsv(jobs: Job[]): string {
  const header = [...sheetHeaders.Jobs, "expense_total", "report_income", "net_profit", "unpaid_amount", "expense_items"];
  const rows = jobs.map((job) => {
    const totals = paymentTotals([job]);
    return [...jobToRow(job), sumMoney(job.expenses.map((item) => item.amount)), totals.income, totals.net, totals.outstanding, JSON.stringify(job.expenses)];
  });
  return "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
