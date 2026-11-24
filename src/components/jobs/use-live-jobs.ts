"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppRuntime, useErrorToast } from "@/components/ui/app-runtime";
import { mutationEvent, overlayJobs, queuedRequests } from "@/lib/offline/store";
import type { MutationEvent } from "@/types/offline";
import { effectivePaymentStatus } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import { t } from "@/lib/i18n";
import type { PaymentInput } from "@/lib/payments/validation";
import type { Job } from "@/types/job";

export function useLiveJobs(initialJobs: Job[], paused = false, initialError = "") {
  const { account, entries, mutate } = useAppRuntime();
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(0);
  const [checkedAt, setCheckedAt] = useState("");
  const locked = useRef(new Set<string>());
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  useErrorToast(error);
  const invalidate = useCallback(() => { generation.current++; request.current?.abort(); }, []);
  const refresh = useCallback(async () => {
    if (paused || locked.current.size || !navigator.onLine || document.visibilityState === "hidden") return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const version = ++generation.current;
    setRefreshing(true);
    try {
      const response = await fetch("/api/jobs", { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.jobs.loadFailed);
      if (version === generation.current && !locked.current.size) { setJobs(data.jobs); setError(""); setCheckedAt(new Date().toISOString()); }
    } catch (reason) {
      if (!controller.signal.aborted && version === generation.current) setError(reason instanceof Error ? reason.message : t.jobs.loadFailed);
    } finally { if (request.current === controller) setRefreshing(false); }
  }, [paused]);
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 30000);
    const wake = () => void refresh();
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake); window.addEventListener("daily-work-log:discarded", wake);
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(timer); request.current?.abort(); invalidate(); window.removeEventListener("focus", wake); window.removeEventListener("online", wake); window.removeEventListener("daily-work-log:discarded", wake); document.removeEventListener("visibilitychange", wake); };
  }, [refresh, invalidate]);
  async function savePayment(job: Job, input: PaymentInput): Promise<Job> {
    if (locked.current.size || paused) throw new Error(t.payment.saving);
    locked.current.add(job.id); generation.current++; request.current?.abort();
    setPendingPayment(locked.current.size); setError("");
    const previous = jobs.find((value) => value.id === job.id) || job;
    const optimistic = { ...previous, paymentStatus: effectivePaymentStatus({ ...previous, ...input }, bangkokDate()), paidAmount: input.paidAmount, paidDate: input.paidDate };
    setJobs((current) => current.map((value) => value.id === job.id ? optimistic : value));
    try {
      const local = { ...optimistic, updatedAt: new Date().toISOString() };
      const data = await mutate({ url: `/api/jobs/${job.id}/payment`, method: "PATCH", entity: `job:${job.id}`, label: `การชำระเงิน: ${job.client}`, json: { ...input }, optimistic: { job: local }, base: { ...previous }, localVersion: local.updatedAt });
      const saved = data.job!;
      setJobs((current) => current.map((value) => value.id === saved.id ? data.queued ? previous : saved : value));
      setCheckedAt(new Date().toISOString());
      return saved;
    } catch (reason) {
      setJobs((current) => current.map((value) => value.id === job.id ? previous : value));
      setError(reason instanceof Error ? reason.message : t.payment.failed);
      throw reason;
    } finally { locked.current.delete(job.id); setPendingPayment(locked.current.size); generation.current++; }
  }
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<MutationEvent>).detail;
      if (detail.account !== account) return;
      if (detail.data.job) setJobs((current) => current.some((job) => job.id === detail.data.job!.id) ? current.map((job) => job.id === detail.data.job!.id ? detail.data.job! : job) : [...current, detail.data.job!]);
      else if (detail.data.deleted && detail.entry.entity.startsWith("job:")) setJobs((current) => current.filter((job) => `job:${job.id}` !== detail.entry.entity));
    };
    const frame = requestAnimationFrame(() => { const pending = queuedRequests(account); if (pending.length) setJobs((current) => overlayJobs(current, pending)); });
    window.addEventListener(mutationEvent, changed);
    return () => { cancelAnimationFrame(frame); window.removeEventListener(mutationEvent, changed); };
  }, [account]);
  const visibleJobs = overlayJobs(jobs, entries);
  return { jobs: visibleJobs, setJobs, error, setError, refreshing, pendingPayment: pendingPayment > 0, checkedAt, refresh, savePayment };
}
