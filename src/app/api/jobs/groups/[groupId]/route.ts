import type { NextRequest } from "next/server";
import { jobApi, jobId, readBody } from "@/lib/jobs/api";
import { groupInputSchema, groupDeleteSchema } from "@/lib/jobs/group-validation";
import { saveGroup, deleteGroup } from "@/lib/jobs/group-service";

type Context = { params: Promise<{ groupId: string }> };
export const maxDuration = 120;
export async function PUT(request: NextRequest, context: Context) {
  return jobApi(request, async () => saveGroup(jobId((await context.params).groupId), groupInputSchema.parse(await readBody(request, 3500000))));
}
export async function DELETE(request: NextRequest, context: Context) {
  return jobApi(request, async () => deleteGroup(jobId((await context.params).groupId), groupDeleteSchema.parse(await readBody(request)).versions));
}
