import type { NextRequest } from "next/server";
import { jobApi } from "@/lib/jobs/api";
import { JobError } from "@/lib/jobs/service";
import { seedDemoData } from "@/lib/demo/seed";

export async function POST(request: NextRequest) {
  return jobApi(request, async () => {
    if (process.env.ENABLE_DEMO_SEED !== "true") throw new JobError(404, "ยังไม่ได้เปิดใช้ข้อมูลตัวอย่าง");
    return seedDemoData();
  });
}
