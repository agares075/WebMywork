"use client";

import { useEffect, useState } from "react";
import { useAppRuntime } from "@/components/ui/app-runtime";
import { useLocalDraft } from "@/components/ui/use-local-draft";
import { mergeJobs, mutationEvent, overlayJobs } from "@/lib/offline/store";
import type { MutationEvent } from "@/types/offline";
import type { Job } from "@/types/job";
import type { DayPayment } from "@/lib/jobs/multi-day";

export function useGroupEdit(id: string, initialJob: Job | undefined, initialMembers: Job[], email: string) {
  const { account, entries } = useAppRuntime();
  const [saved, setPersistedJob] = useState(initialJob);
  const [rows, setGroupRows] = useState(initialMembers);
  const settings = useLocalDraft<{ allDays: boolean; groupPayment: DayPayment | null }>(initialJob?.jobGroupId ? `daily-work-log:${email}:${id}:group-edit` : null, { allDays: false, groupPayment: null });
  const persistedJob = overlayJobs(saved ? [saved] : [], entries).find((job) => job.id === id) || saved;
  const members = mergeJobs(overlayJobs(rows, entries), { job: persistedJob }).filter((job) => persistedJob?.jobGroupId && job.jobGroupId === persistedJob.jobGroupId).sort((a, b) => a.workDate.localeCompare(b.workDate));
  useEffect(() => {
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<MutationEvent>).detail;
      if (detail.account !== account) return;
      const jobs = [...(detail.data.jobs || []), ...(detail.data.job ? [detail.data.job] : [])];
      const current = jobs.find((job) => job.id === id);
      if (current) setPersistedJob(current);
      if (jobs.length || detail.data.deletedIds) setGroupRows((previous) => mergeJobs(previous, detail.data));
    };
    window.addEventListener(mutationEvent, synced);
    return () => window.removeEventListener(mutationEvent, synced);
  }, [account, id]);
  return {
    persistedJob, setPersistedJob, members, setGroupRows,
    allDays: settings.value.allDays, groupPayment: settings.value.groupPayment,
    setAllDays: (allDays: boolean) => settings.setValue((value) => ({ ...value, allDays })),
    setGroupPayment: (groupPayment: DayPayment | null) => settings.setValue((value) => ({ ...value, groupPayment })),
    clearSettings: settings.clear, settingsReady: settings.ready
  };
}
