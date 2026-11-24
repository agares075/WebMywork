import type { NextRequest } from "next/server";
import { jobApi, jobId } from "@/lib/jobs/api";
import { retryJobSync } from "@/lib/jobs/service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return jobApi(request, async () => retryJobSync(jobId((await context.params).id)));
}
