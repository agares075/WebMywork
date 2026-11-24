import type { NextRequest } from "next/server";
import { jobApi, jobId } from "@/lib/jobs/api";
import { deleteJobFile, saveJobFile } from "@/lib/files/service";
import { readUpload } from "@/lib/files/validate-upload";

type Context = { params: Promise<{ id: string; fileId: string }> };
export async function PUT(request: NextRequest, context: Context) {
  return jobApi(request, async () => {
    const { id, fileId } = await context.params;
    return { file: await saveJobFile(jobId(id), jobId(fileId), await readUpload(request), true) };
  });
}
export async function DELETE(request: NextRequest, context: Context) {
  return jobApi(request, async () => {
    const { id, fileId } = await context.params;
    await deleteJobFile(jobId(id), jobId(fileId));
    return { deleted: true };
  });
}
