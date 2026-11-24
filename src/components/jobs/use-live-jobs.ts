"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { effectivePaymentStatus } from "@/lib/payments/logic";
import { bangkokDate } from "@/lib/calculations";
import { t } from "@/lib/i18n";
import type { PaymentInput } from "@/lib/payments/validation";
import type { Job } from "@/types/job";

export function useLiveJobs(initialJobs: Job[], paused = false, initialError = "") {
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(0);
  const [checkedAt, setCheckedAt] = useState("");
  const locked = useRef(new Set<string>());
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
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
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(timer); request.current?.abort(); generation.current++; window.removeEventListener("focus", wake); window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake); };
  }, [refresh]);
  async function savePayment(job: Job, input: PaymentInput): Promise<Job> {
    if (locked.current.size || paused) throw new Error(t.payment.saving);
    locked.current.add(job.id); generation.current++; request.current?.abort();
    setPendingPayment(locked.current.size); setError("");
    const previous = jobs.find((value) => value.id === job.id) || job;
    const optimistic = { ...previous, paymentStatus: effectivePaymentStatus({ ...previous, ...input }, bangkokDate()), paidAmount: input.paidAmount, paidDate: input.paidDate };
    setJobs((current) => current.map((value) => value.id === job.id ? optimistic : value));
    try {
      const response = await fetch(`/api/jobs/${job.id}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.payment.failed);
      const saved: Job = data.job;
      setJobs((current) => current.map((value) => value.id === saved.id ? saved : value));
      setCheckedAt(new Date().toISOString());
      return saved;
    } catch (reason) {
      setJobs((current) => current.map((value) => value.id === job.id ? previous : value));
      setError(reason instanceof Error ? reason.message : t.payment.failed);
      throw reason;
    } finally { locked.current.delete(job.id); setPendingPayment(locked.current.size); generation.current++; }
  }
  return { jobs, setJobs, error, setError, refreshing, pendingPayment: pendingPayment > 0, checkedAt, refresh, savePayment };
}
