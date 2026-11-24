"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";
import { readCache, writeCache } from "@/lib/offline/cache";
import { useAppRuntime } from "./app-runtime";

export function useLocalDraft<T extends object>(key: string | null, initial: T) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const seed = useRef(initial);
  const { notify } = useAppRuntime();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = readCache<unknown>(key, null);
      if (stored && typeof stored === "object" && Object.entries(seed.current).every(([name, sample]) => typeof (stored as Record<string, unknown>)[name] === typeof sample)) { setValue(stored as T); setDirty(true); }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);
  useEffect(() => {
    if (!key || !ready || !dirty) return;
    const persist = () => { try { writeCache(key, value); } catch (error) { notify(error instanceof Error ? error.message : "เก็บฉบับร่างไม่ได้", "error"); } };
    const timer = setTimeout(persist, 300);
    window.addEventListener("offline", persist); window.addEventListener("pagehide", persist);
    return () => { clearTimeout(timer); window.removeEventListener("offline", persist); window.removeEventListener("pagehide", persist); };
  }, [key, value, ready, dirty, notify]);
  function update(next: SetStateAction<T>) { setDirty(true); setValue(next); }
  function clear() { setDirty(false); if (key) try { localStorage.removeItem(key); } catch { /* The existing draft remains available. */ } }
  return { value, setValue: update, ready, clear };
}
