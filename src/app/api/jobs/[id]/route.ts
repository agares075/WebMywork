import type { NextRequest } from "next/server";
import { z } from "zod";
import { jobApi, jobId, readBody } from "@/lib/jobs/api";
import { jobInputSchema } from "@/lib/jobs/validation";
import { deleteJob, saveJob } from "@/lib/jobs/service";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: NextRequest, context: Context) {
  return jobApi(request, async () => saveJob(jobId((await context.params).id), jobInputSchema.parse(await readBody(request))));
}
export async function DELETE(request: NextRequest, context: Context) {
  return jobApi(request, async () => {
    const input = z.object({ updatedAt: z.iso.datetime() }).strict().parse(await readBody(request));
    return deleteJob(jobId((await context.params).id), input.updatedAt);
  });
}
