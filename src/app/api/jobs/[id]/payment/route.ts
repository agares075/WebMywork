import type { NextRequest } from "next/server";
import { jobApi, jobId, readBody } from "@/lib/jobs/api";
import { paymentInputSchema } from "@/lib/payments/validation";
import { updatePayment } from "@/lib/payments/service";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return jobApi(request, async () => ({ job: await updatePayment(jobId((await context.params).id), paymentInputSchema.parse(await readBody(request))) }));
}
