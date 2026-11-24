import type { NextRequest } from "next/server";
import { jobApi } from "@/lib/jobs/api";
import { contactHistory } from "@/lib/contacts/service";

export async function GET(request: NextRequest) {
  return jobApi(request, async () => ({ contacts: await contactHistory() }), false);
}
