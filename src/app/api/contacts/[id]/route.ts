import type { NextRequest } from "next/server";
import { z } from "zod";
import { jobApi, jobId, readBody } from "@/lib/jobs/api";
import { contactInputSchema } from "@/lib/contacts/validation";
import { saveContact, deleteContact } from "@/lib/contacts/service";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: NextRequest, context: Context) {
  return jobApi(request, async () => {
    const { updatedAt, ...input } = contactInputSchema.extend({ updatedAt: z.iso.datetime().optional() }).parse(await readBody(request));
    return { contact: await saveContact(jobId((await context.params).id), input, updatedAt) };
  });
}
export async function DELETE(request: NextRequest, context: Context) {
  return jobApi(request, async () => {
    const input = z.object({ updatedAt: z.iso.datetime() }).strict().parse(await readBody(request));
    await deleteContact(jobId((await context.params).id), input.updatedAt);
    return { deleted: true };
  });
}
