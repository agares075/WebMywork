"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/lib/i18n";
import type { Job } from "@/types/job";

export function DeleteJobDialog({ job, jobs, busy, onClose, onConfirm }: { job: Job; jobs: Job[]; busy: boolean; onClose: () => void; onConfirm: (all: boolean) => void }) {
  const [all, setAll] = useState(false);
  const members = job.jobGroupId ? jobs.filter((value) => value.jobGroupId === job.jobGroupId) : [job];
  return <ConfirmDialog title={all ? `ลบงานทั้ง ${members.length} วันหรือไม่?` : t.jobs.deleteTitle} description={`${job.client} · ${all ? "จะลบทุกวันในกลุ่ม รวมกิจกรรม Calendar และเอกสารของแต่ละวัน" : t.jobs.deleteDescription}`} confirmLabel={all ? "ยืนยันลบทุกวัน" : "ยืนยันลบวันนี้"} busy={busy} onClose={onClose} onConfirm={() => onConfirm(all)}>{members.length > 1 && <fieldset className="form-disabled-group" disabled={busy}><label className="checkbox-field"><input type="radio" name="delete-scope" checked={!all} onChange={() => setAll(false)} /><span>ลบเฉพาะวันนี้</span></label><label className="checkbox-field"><input type="radio" name="delete-scope" checked={all} onChange={() => setAll(true)} /><span>ลบทุกวันในกลุ่ม ({members.length} วัน)</span></label></fieldset>}</ConfirmDialog>;
}
