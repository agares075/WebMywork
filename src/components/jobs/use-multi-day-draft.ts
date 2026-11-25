"use client";

import { useEffect, useRef } from "react";
import { useLocalDraft } from "@/components/ui/use-local-draft";
import type { JobInput } from "@/types/job";
import { mutationEvent } from "@/lib/offline/store";
import type { MutationEvent } from "@/types/offline";
import type { MultiDayDraft } from "@/lib/jobs/multi-day";

export function useMultiDayDraft(email: string, id: string, initial: JobInput) {
  const key = `daily-work-log:${email}:multi-day`;
  const draft = useLocalDraft<MultiDayDraft>(key, { id, common: initial, dates: [initial.workDate], mode: "range", rangeStart: initial.workDate, rangeEnd: initial.workDate, overrides: {}, incomeMode: "per_day", totalIncome: initial.income, payAfterLast: false, submitted: false, confirmed: false });
  const migrated = useRef(false);
  useEffect(() => {
    if (!draft.ready || migrated.current) return;
    const frame = requestAnimationFrame(() => {
      migrated.current = true;
      try {
        if (localStorage.getItem(key)) return;
        const old = JSON.parse(localStorage.getItem(`daily-work-log:${email}:new`) || "null");
        if (old?.id && old.input?.workDate && Array.isArray(old.input.expenses)) draft.setValue((value) => ({ ...value, id: old.id, common: old.input, dates: [old.input.workDate], rangeStart: old.input.workDate, rangeEnd: old.input.workDate }));
      } catch { /* Invalid old drafts do not replace the new form. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [draft, email, key]);
  useEffect(() => {
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<MutationEvent>).detail;
      if (detail.account === email && detail.entry.entity === `group:${draft.value.id}` && detail.entry.method === "PUT" && detail.data.jobs?.length) draft.setValue((value) => ({ ...value, submitted: true, confirmed: true }));
    };
    window.addEventListener(mutationEvent, synced);
    return () => window.removeEventListener(mutationEvent, synced);
  }, [draft, email]);
  function clear() {
    draft.clear();
    try { localStorage.removeItem(`daily-work-log:${email}:new`); } catch { /* The form remains usable. */ }
  }
  return { ...draft, clear };
}
