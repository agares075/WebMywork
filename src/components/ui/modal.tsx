"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`feature-modal ${wide ? "wide-modal" : ""}`} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}><div className="modal-heading"><h2 id={id}>{title}</h2><button type="button" className="button button-quiet" onClick={onClose} disabled={busy} aria-label="ปิด">×</button></div>{children}</dialog>;
}
