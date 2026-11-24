"use client";

import { useEffect, useState } from "react";
import type { JobInput } from "@/types/job";
import { t } from "@/lib/i18n";

type Draft = { id: string; input: JobInput };
function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Draft;
  const input = draft.input;
  return typeof draft.id === "string" && /^[a-f0-9-]{36}$/i.test(draft.id) && !!input && typeof input === "object" && typeof input.client === "string" && typeof input.workDate === "string" && typeof input.startTime === "string" && typeof input.endTime === "string" && typeof input.details === "string" && typeof input.location === "string" && typeof input.checkIn === "string" && typeof input.checkOut === "string" && typeof input.income === "number" && typeof input.creditDays === "number" && typeof input.outfit === "string" && typeof input.shoes === "string" && typeof input.comment === "string" && typeof input.reminderEnabled === "boolean" && (input.teamMemberIds === undefined || (Array.isArray(input.teamMemberIds) && input.teamMemberIds.every((id) => typeof id === "string"))) && Array.isArray(input.expenses) && input.expenses.every((item) => typeof item.id === "string" && typeof item.label === "string" && typeof item.amount === "number");
}
export function useJobDraft(key: string, initial: Draft) {
  const [draft, setDraft] = useState(initial);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(key);
        const stored: unknown = raw ? JSON.parse(raw) : null;
        if (isDraft(stored) && (key.endsWith(":new") || stored.id === initial.id)) {
          setDraft(stored); setDirty(true); setMessage(t.jobs.draftRestored);
        }
      } catch { setMessage(t.jobs.draftUnavailable); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [key, initial.id]);
  useEffect(() => {
    if (!ready || !dirty) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(draft)); setMessage(t.jobs.draft); }
      catch { setMessage(t.jobs.draftUnavailable); }
    }, 500);
    function persist() {
      try { localStorage.setItem(key, JSON.stringify(draft)); } catch { /* Keep the form usable when storage is unavailable. */ }
    }
    window.addEventListener("pagehide", persist);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", persist); };
  }, [draft, key, ready, dirty]);
  function update<K extends keyof JobInput>(field: K, value: JobInput[K]) {
    setDirty(true); setDraft((current) => ({ ...current, input: { ...current.input, [field]: value } }));
  }
  function clear() {
    try { localStorage.removeItem(key); } catch { /* No saved draft to clear. */ }
    setDirty(false); setMessage("");
  }
  function reset() { clear(); setDraft(initial); }
  function advanceVersion(version: string) { setDraft((current) => ({ ...current, input: { ...current.input, baseUpdatedAt: version } })); }
  return { draft, update, ready, message, dirty, clear, reset, advanceVersion };
}
