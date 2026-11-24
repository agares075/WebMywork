import type { NextRequest } from "next/server";
import { jobApi, jobId } from "@/lib/jobs/api";
import { listJobFiles, saveJobFile } from "@/lib/files/service";
import { readUpload } from "@/lib/files/validate-upload";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  return jobApi(request, async () => ({ files: await listJobFiles(jobId((await context.params).id)) }), false);
}
export async function POST(request: NextRequest, context: Context) {
  return jobApi(request, async () => {
    const upload = await readUpload(request);
    return { file: await saveJobFile(jobId((await context.params).id), jobId(String(upload.id)), upload) };
  });
}
