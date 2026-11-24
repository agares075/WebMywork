"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { localFileType } from "@/lib/files/rules";
import { t } from "@/lib/i18n";
import type { FileChange } from "./use-job-files";

export function FilePreview({ item, jobId, onClose }: { item: FileChange; jobId: string; onClose: () => void }) {
  const [source] = useState(() => item.file ? URL.createObjectURL(item.file) : `/api/jobs/${jobId}/files/${item.id}/content`);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { if (item.file) URL.revokeObjectURL(source); }, [item.file, source]);
  const name = item.file?.name || item.original?.name || t.files.title;
  const mime = item.file ? localFileType(item.file) : item.original?.mimeType;
  return <Modal title={name} wide onClose={onClose}>
    <div className="file-preview">{mime === "application/pdf" ? <iframe title={name} src={source} /> : !failed ? <Image src={source} alt={name} width={1000} height={1300} unoptimized onError={() => setFailed(true)} /> : <p className="empty-state">{t.files.previewFallback}</p>}</div>
    <p className="field-help">{t.files.previewFallback}</p><div className="preview-actions"><a className="button button-secondary" href={source} target="_blank" rel="noopener noreferrer">{t.files.download}</a>{item.original && <a className="button button-secondary" href={item.original.url} target="_blank" rel="noopener noreferrer">{t.files.open}</a>}</div>
  </Modal>;
}
