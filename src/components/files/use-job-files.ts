"use client";

import { useEffect, useRef, useState } from "react";
import { localFileType, maxJobFiles } from "@/lib/files/rules";
import { prepareCertificate } from "@/lib/files/compress-image";
import { binaryStore } from "@/lib/offline/binary-store";
import { readCache, writeCache } from "@/lib/offline/cache";
import { mutationEvent } from "@/lib/offline/store";
import { useAppRuntime, useErrorToast } from "@/components/ui/app-runtime";
import { t } from "@/lib/i18n";
import type { MutationEvent } from "@/types/offline";
import type { JobFile } from "@/types/file";

export type FileChange = { id: string; file?: File; original?: JobFile; deleting?: boolean; queued?: boolean };
export function useJobFiles(jobId: string, enabled: boolean) {
  const { account, entries, mutate } = useAppRuntime();
  const [files, setFiles] = useState<JobFile[]>([]);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [queued, setQueued] = useState<FileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const processLock = useRef(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const draftKey = `file-draft:${account}:${jobId}`;
  const cacheKey = `daily-work-log:${account}:files:${jobId}`;
  useErrorToast(error);
  useEffect(() => {
    if (!enabled || !account) return;
    const controller = new AbortController();
    async function load() {
      try {
        const draft = await binaryStore<FileChange[]>(draftKey, "get").catch(() => undefined);
        if (!controller.signal.aborted && draft) setChanges(draft);
        const cached = readCache<JobFile[]>(cacheKey, []);
        if (!controller.signal.aborted) setFiles(cached);
        if (!navigator.onLine) { if (!controller.signal.aborted) setLoading(false); return; }
        const response = await fetch(`/api/jobs/${jobId}/files`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t.files.failed);
        if (!controller.signal.aborted) { setFiles(data.files); setLoading(false); setError(""); try { writeCache(cacheKey, data.files); } catch { /* File drafts have their own persistent storage. */ } }
      } catch (reason) { if (!controller.signal.aborted) { setLoading(false); if (navigator.onLine) setError(reason instanceof Error ? reason.message : t.files.failed); } }
    }
    void load();
    const wake = () => setReload((value) => value + 1);
    window.addEventListener("online", wake);
    return () => { controller.abort(); window.removeEventListener("online", wake); };
  }, [account, cacheKey, draftKey, jobId, enabled, reload]);
  useEffect(() => {
    let active = true;
    async function previews() {
      const items: FileChange[] = [];
      for (const entry of entries) {
        if (!entry.optimistic.file || entry.optimistic.file.jobId !== jobId || !entry.blobKey || !entry.form) continue;
        const blob = await binaryStore<Blob>(entry.blobKey, "get");
        if (blob) items.push({ id: entry.optimistic.file.id, original: entry.optimistic.file, file: new File([blob], entry.form.name, { type: entry.form.type }), queued: true });
      }
      if (active) setQueued(items);
    }
    void previews().catch(() => undefined);
    return () => { active = false; };
  }, [entries, jobId]);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<MutationEvent>).detail;
      if (detail.account !== account || !detail.entry.url.startsWith(`/api/jobs/${jobId}/files`)) return;
      if (detail.data.file) setFiles((current) => [...current.filter((file) => file.id !== detail.data.file!.id), detail.data.file!]);
      else if (detail.data.deleted) setFiles((current) => current.filter((file) => `file:${file.id}` !== detail.entry.entity));
    };
    window.addEventListener(mutationEvent, changed); return () => window.removeEventListener(mutationEvent, changed);
  }, [account, jobId]);
  let effective = [...files];
  for (const entry of entries) {
    if (entry.optimistic.file?.jobId === jobId) effective = [...effective.filter((file) => file.id !== entry.optimistic.file!.id), entry.optimistic.file];
    else if (entry.optimistic.deleted && entry.url.startsWith(`/api/jobs/${jobId}/files`)) effective = effective.filter((file) => `file:${file.id}` !== entry.entity);
  }
  const items: FileChange[] = [...effective.map((original) => changes.find((change) => change.id === original.id) || queued.find((change) => change.id === original.id) || { id: original.id, original }), ...changes.filter((change) => !effective.some((file) => file.id === change.id))];
  async function persist(next: FileChange[]) { await binaryStore(draftKey, "put", next); setChanges(next); }
  async function select(selected: File[], replaceId?: string) {
    if (processLock.current) return;
    processLock.current = true; setProcessing(true); setError("");
    let updated = [...changes];
    let count = items.filter((item) => !item.deleting).length;
    try {
      for (const originalFile of selected) {
        if (!replaceId && count >= maxJobFiles) throw new Error(t.files.maxFiles);
        const file = await prepareCertificate(originalFile);
        const id = replaceId || crypto.randomUUID();
        const original = effective.find((item) => item.id === id);
        updated = [...updated.filter((item) => item.id !== id), { id, file, original }];
        if (!replaceId) count++;
      }
      await persist(updated);
    } catch (reason) { setChanges(updated); setError(reason instanceof Error ? reason.message : t.files.failed); try { await binaryStore(draftKey, "put", updated); } catch { /* Keep selected files visible if storage is unavailable. */ } }
    finally { processLock.current = false; setProcessing(false); }
  }
  async function remove(id: string) { try { const original = effective.find((file) => file.id === id); await persist([...changes.filter((change) => change.id !== id), ...(original ? [{ id, original, deleting: true }] : [])]); } catch (reason) { setError(reason instanceof Error ? reason.message : t.files.failed); } }
  async function undo(id: string) { try { await persist(changes.filter((change) => change.id !== id)); } catch (reason) { setError(reason instanceof Error ? reason.message : t.files.failed); } }
  async function flush(): Promise<boolean> {
    let deferred = false;
    let remaining = [...changes];
    for (const change of [...changes].sort((a, b) => Number(Boolean(b.deleting)) - Number(Boolean(a.deleting)))) {
      const original = change.original;
      const optimistic = change.deleting ? { deleted: true } : { file: { id: change.id, jobId, driveFileId: original?.driveFileId || "", name: change.file!.name, mimeType: localFileType(change.file!), url: original?.url || "", createdAt: original?.createdAt || new Date().toISOString() } };
      const data = await mutate({ url: `/api/jobs/${jobId}/files${original ? `/${change.id}` : ""}`, method: change.deleting ? "DELETE" : original ? "PUT" : "POST", entity: `file:${change.id}`, label: `${t.files.title}: ${change.file?.name || original?.name}`, ...(change.file ? { file: change.file, fileId: change.id } : {}), optimistic });
      deferred ||= Boolean(data.queued);
      setFiles((current) => change.deleting ? current.filter((file) => file.id !== change.id) : [...current.filter((file) => file.id !== change.id), data.file!]);
      remaining = remaining.filter((item) => item.id !== change.id); await persist(remaining);
    }
    return deferred;
  }
  return { items, changes, loading, processing, error, select, remove, undo, flush, reset: () => { void persist([]).catch(() => setError(t.files.failed)); }, refresh: () => setReload((value) => value + 1), hasChanges: changes.length > 0 };
}
export type JobFilesState = ReturnType<typeof useJobFiles>;
