"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { t } from "@/lib/i18n";

export function ConfirmDialog({ title, description, confirmLabel, busyLabel, busy, onConfirm, onClose, children }: { title: string; description: string; confirmLabel: string; busyLabel?: string; busy: boolean; onConfirm: () => void; onClose: () => void; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="confirm-title">{title}</h2><p id="confirm-description">{description}</p>
    {children}<div className="dialog-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose} autoFocus>{t.jobs.cancel}</button><button type="button" className="button button-danger" disabled={busy} onClick={onConfirm}>{busy ? (busyLabel || t.jobs.deleting) : confirmLabel}</button></div>
  </dialog>;
}
