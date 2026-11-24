"use client";

import { useEffect, useState } from "react";
import { localFileType, maxFileBytes, maxJobFiles } from "@/lib/files/rules";
import { t } from "@/lib/i18n";
import type { JobFile } from "@/types/file";

export type FileChange = { id: string; file?: File; original?: JobFile; deleting?: boolean };
export function useJobFiles(jobId: string, enabled: boolean) {
  const [files, setFiles] = useState<JobFile[]>([]);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/jobs/${jobId}/files`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t.files.failed);
        if (!controller.signal.aborted) { setFiles(data.files); setLoading(false); setError(""); }
      } catch (reason) {
        if (!controller.signal.aborted) { setLoading(false); setError(reason instanceof Error ? reason.message : t.files.failed); }
      }
    }
    void load();
    return () => controller.abort();
  }, [jobId, enabled, reload]);
  const items: FileChange[] = [...files.map((original) => changes.find((change) => change.id === original.id) || { id: original.id, original }), ...changes.filter((change) => !files.some((file) => file.id === change.id))];
  function select(selected: File[], replaceId?: string) {
    let updated = [...changes];
    let count = items.filter((item) => !item.deleting).length;
    let message = "";
    for (const file of selected) {
      if (!file.size || !localFileType(file)) { message = `${file.name}: ${t.files.invalidType}`; continue; }
      if (file.size > maxFileBytes) { message = `${file.name}: ${t.files.tooLarge}`; continue; }
      if (!replaceId && count >= maxJobFiles) { message = t.files.maxFiles; break; }
      const id = replaceId || crypto.randomUUID();
      const original = files.find((item) => item.id === id);
      updated = [...updated.filter((item) => item.id !== id), { id, file, original }];
      if (!replaceId) count++;
    }
    setChanges(updated); setError(message);
  }
  function remove(id: string) {
    const original = files.find((file) => file.id === id);
    setChanges((current) => [...current.filter((change) => change.id !== id), ...(original ? [{ id, original, deleting: true }] : [])]);
  }
  function undo(id: string) { setChanges((current) => current.filter((change) => change.id !== id)); }
  async function flush() {
    const ordered = [...changes].sort((a, b) => Number(Boolean(b.deleting)) - Number(Boolean(a.deleting)));
    for (const change of ordered) {
      const body = new FormData();
      if (change.file) { body.set("id", change.id); body.set("file", change.file); }
      const url = `/api/jobs/${jobId}/files${change.original ? `/${change.id}` : ""}`;
      const response = await fetch(url, { method: change.deleting ? "DELETE" : change.original ? "PUT" : "POST", ...(!change.deleting ? { body } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.files.failed);
      setFiles((current) => change.deleting ? current.filter((file) => file.id !== change.id) : [...current.filter((file) => file.id !== change.id), data.file]);
      setChanges((current) => current.filter((item) => item.id !== change.id));
    }
  }
  return { items, changes, loading, error, select, remove, undo, flush, reset: () => setChanges([]), refresh: () => setReload((value) => value + 1), hasChanges: changes.length > 0 };
}
export type JobFilesState = ReturnType<typeof useJobFiles>;
