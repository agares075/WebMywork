"use client";

import { useRef, useState } from "react";
import { FormSection } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilePreview } from "./file-preview";
import { certificateAccept } from "@/lib/files/rules";
import { t } from "@/lib/i18n";
import type { FileChange, JobFilesState } from "./use-job-files";

export function CertificateSection({ jobId, state }: { jobId: string; state: JobFilesState }) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const replacement = useRef<HTMLInputElement>(null);
  const replaceId = useRef("");
  const [preview, setPreview] = useState<FileChange | null>(null);
  const [deleting, setDeleting] = useState<FileChange | null>(null);
  return <FormSection title={t.files.title}>
    <p className="certificate-description">{t.files.description}</p><p className="field-help">{t.files.limit}</p>
    <input ref={gallery} type="file" accept={certificateAccept} multiple hidden onChange={(event) => { state.select(Array.from(event.target.files || [])); event.target.value = ""; }} />
    <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { state.select(Array.from(event.target.files || [])); event.target.value = ""; }} />
    <input ref={replacement} type="file" accept={certificateAccept} hidden onChange={(event) => { state.select(Array.from(event.target.files || []), replaceId.current); event.target.value = ""; }} />
    <div className="certificate-actions"><button type="button" className="button button-secondary" disabled={state.loading} onClick={() => gallery.current?.click()}>{t.files.choose}</button><button type="button" className="button button-secondary" disabled={state.loading} onClick={() => camera.current?.click()}>{t.files.camera}</button></div>
    <p className="field-help">{t.files.saveNote}</p>
    {state.loading && <p className="field-help" role="status">กำลังโหลดเอกสาร…</p>}
    {state.error && <div className="notice notice-error" role="alert">{state.error}<button type="button" className="button button-quiet" onClick={state.refresh}>ลองใหม่</button></div>}
    {!state.items.length && !state.loading && <p className="picker-empty">{t.files.empty}</p>}
    <div className="certificate-list">{state.items.map((item) => <article className={`certificate-card ${item.deleting ? "certificate-deleting" : ""}`} key={item.id}>
      <div className="certificate-file-name"><strong>{item.file?.name || item.original?.name}</strong><span>{item.deleting ? t.files.pendingDelete : item.file ? t.files.pending : item.original?.mimeType === "application/pdf" ? "PDF" : "รูปภาพ"}</span></div>
      <div className="certificate-file-actions">{!item.deleting && <><button type="button" className="button button-secondary" onClick={() => setPreview(item)}>{t.files.preview}</button><button type="button" className="button button-quiet" disabled={state.loading} onClick={() => { replaceId.current = item.id; replacement.current?.click(); }}>{t.files.replace}</button><button type="button" className="button button-quiet delete-text" onClick={() => setDeleting(item)}>{t.files.delete}</button></>}{(item.file || item.deleting) && <button type="button" className="button button-quiet" onClick={() => state.undo(item.id)}>{t.files.undo}</button>}</div>
    </article>)}</div>
    {preview && <FilePreview key={`${preview.id}:${preview.file?.lastModified || 0}`} item={preview} jobId={jobId} onClose={() => setPreview(null)} />}
    {deleting && <ConfirmDialog title={t.files.deleteTitle} description={deleting.original ? t.files.deleteDescription : "นำไฟล์ที่เลือกนี้ออกจากรายการ"} confirmLabel={t.files.delete} busy={false} onClose={() => setDeleting(null)} onConfirm={() => { state.remove(deleting.id); setDeleting(null); }} />}
  </FormSection>;
}
