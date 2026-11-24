import type { NextRequest } from "next/server";
import { jobApi, jobId } from "@/lib/jobs/api";
import { previewJobFile } from "@/lib/files/service";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; fileId: string }> }) {
  return jobApi(request, async () => {
    const { id, fileId } = await context.params;
    return previewJobFile(jobId(id), jobId(fileId));
  }, false);
}
