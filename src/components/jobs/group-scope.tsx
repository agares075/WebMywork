import Link from "next/link";
import { FormSection } from "@/components/ui/form-field";
import { formatDay } from "@/lib/calendar";
import type { Job } from "@/types/job";

export function GroupScope({ job, members, all, onChange }: { job: Job; members: Job[]; all: boolean; onChange: (all: boolean) => void }) {
  return <FormSection title="งานในกลุ่มเดียวกัน"><div className="group-day-links">{members.map((member, index) => member.id === job.id ? <strong key={member.id} aria-current="page">วันที่ {index + 1}/{members.length} · {formatDay(member.workDate, { day: "numeric", month: "short" })}</strong> : <Link className="text-link" href={`/jobs/${member.id}`} key={member.id}>{formatDay(member.workDate, { day: "numeric", month: "short" })}</Link>)}</div><label className="checkbox-field"><input type="radio" name="edit-scope" checked={!all} onChange={() => onChange(false)} /><span>แก้เฉพาะวันนี้</span></label><label className="checkbox-field"><input type="radio" name="edit-scope" checked={all} disabled={members.some((member) => member.syncStatus === "delete_pending")} onChange={() => onChange(true)} /><span>ใช้การเปลี่ยนแปลงกับทุกวันในกลุ่ม ({members.length} วัน)</span></label><p className="field-help">ใช้เฉพาะช่องที่แก้กับวันอื่น วันที่ทำงานของแต่ละวันยังคงเดิม เอกสารแนบเป็นของวันนี้</p></FormSection>;
}
