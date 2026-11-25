import type { Job } from "@/types/job";
import type { MutationRequest } from "@/types/offline";

export function jobMutation(job: Job, action: "delete" | "sync", jobs: Job[], all = false): MutationRequest {
  if (action === "delete" && all && job.jobGroupId) {
    const members = jobs.filter((value) => value.jobGroupId === job.jobGroupId);
    return { url: `/api/jobs/groups/${job.jobGroupId}`, method: "DELETE", entity: `group:${job.jobGroupId}`, label: `ลบทั้งกลุ่ม: ${job.client}`, json: { versions: members.map(({ id, updatedAt }) => ({ id, updatedAt })) }, optimistic: { deleted: true, deletedIds: members.map((value) => value.id) } };
  }
  return { url: `/api/jobs/${job.id}${action === "sync" ? "/sync" : ""}`, method: action === "sync" ? "POST" : "DELETE", entity: `job:${job.id}`, label: `${action === "delete" ? "ลบงาน" : "ซิงก์ปฏิทิน"}: ${job.client}`, ...(action === "delete" ? { json: { updatedAt: job.updatedAt } } : {}), optimistic: action === "delete" ? { deleted: true, deletedIds: [job.id] } : { job } };
}
