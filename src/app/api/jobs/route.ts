import type { NextRequest } from "next/server";
import { jobApi } from "@/lib/jobs/api";
import { readJobStore } from "@/lib/sheets/job-store";

export async function GET(request: NextRequest) {
  return jobApi(request, async () => ({ jobs: (await readJobStore()).jobs }), false);
}
