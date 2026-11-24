import type { NextRequest } from "next/server";
import { z } from "zod";
import { jobApi } from "@/lib/jobs/api";
import { readJobStore } from "@/lib/sheets/job-store";
import { bangkokDate } from "@/lib/calculations";
import { isCalendarDate } from "@/lib/calendar";
import { filterJobs } from "@/lib/reports/logic";
import { jobsCsv } from "@/lib/reports/csv";
import { paymentStatuses } from "@/lib/payments/logic";
import { outfits } from "@/lib/jobs/validation";

export async function GET(request: NextRequest) {
  return jobApi(request, async () => {
    const params = request.nextUrl.searchParams;
    const filters = z.object({ month: z.string().refine((value) => value === "" || (/^\d{4}-\d{2}$/.test(value) && isCalendarDate(`${value}-01`))), client: z.string().max(200), status: z.union([z.literal(""), z.enum(paymentStatuses)]), outfit: z.union([z.literal(""), z.enum(outfits)]) }).parse({ month: params.get("month") || "", client: params.get("client") || "", status: params.get("status") || "", outfit: params.get("outfit") || "" });
    const jobs = filterJobs((await readJobStore()).jobs, filters, bangkokDate()).sort((a, b) => a.workDate.localeCompare(b.workDate) || a.id.localeCompare(b.id));
    return new Response(jobsCsv(jobs), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="daily-work-log-${filters.month || "all"}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }, false);
}
