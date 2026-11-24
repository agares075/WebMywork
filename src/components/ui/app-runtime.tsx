"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { mutateRequest, flushQueue } from "@/lib/offline/transport";
import { queuedRequests, parseQueue, snapshot, subscribeOutbox, writeQueue } from "@/lib/offline/store";
import { binaryStore } from "@/lib/offline/binary-store";
import type { MutationData, MutationRequest, QueuedRequest } from "@/types/offline";

type Theme = "system" | "light" | "dark";
type Toast = { id: number; message: string; kind: "error" | "info" };
type Runtime = { account: string | null; theme: Theme; setTheme: (value: Theme) => void; entries: QueuedRequest[]; notify: (message: string, kind?: Toast["kind"]) => void; mutate: (request: MutationRequest) => Promise<MutationData> };
const Context = createContext<Runtime | null>(null);
function readTheme(): Theme { try { const value = localStorage.getItem("daily-work-log:theme"); return value === "light" || value === "dark" ? value : "system"; } catch { return "system"; } }

export function AppRuntime({ account, children }: { account: string | null; children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [themeReady, setThemeReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const synchronizing = useRef(false);
  const lastBlocked = useRef("");
  const raw = useSyncExternalStore(subscribeOutbox, useCallback(() => snapshot(account), [account]), () => "[]");
  const entries = useMemo(() => parseQueue(raw), [raw]);
  const notify = useCallback((message: string, kind: Toast["kind"] = "info") => {
    if (!message) return;
    if (/Failed to fetch|fetch failed|NetworkError|Load failed|operation was aborted|Unexpected token/i.test(message)) message = "เชื่อมต่อไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง";
    setToasts((current) => current.some((toast) => toast.message === message) ? current : [...current.slice(-2), { id: Date.now() + Math.random(), message, kind }]);
  }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts((current) => current.slice(1)), 8000);
    return () => clearTimeout(timer);
  }, [toasts]);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); setThemeState(readTheme()); setThemeReady(true); };
    const frame = requestAnimationFrame(update);
    window.addEventListener("online", update); window.addEventListener("offline", update); window.addEventListener("storage", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("online", update); window.removeEventListener("offline", update); window.removeEventListener("storage", update); };
  }, []);
  useEffect(() => {
    if (!themeReady) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? media.matches ? "dark" : "light" : theme; };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, themeReady]);
  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
    try { localStorage.setItem("daily-work-log:theme", value); } catch { notify("อุปกรณ์ไม่อนุญาตให้จดจำธีม", "error"); }
  }, [notify]);
  const sync = useCallback(async () => {
    if (!account || !navigator.onLine || synchronizing.current || document.visibilityState === "hidden") return;
    synchronizing.current = true; setSyncing(true);
    const run = async () => { const count = await flushQueue(account); if (count) notify(`ส่งข้อมูลที่รอไว้แล้ว ${count} รายการ`); const blocked = queuedRequests(account).find((entry) => entry.blocked); if (blocked?.blocked && blocked.id !== lastBlocked.current) notify(blocked.blocked, "error"); lastBlocked.current = blocked?.id || ""; };
    try {
      if (navigator.locks) await navigator.locks.request(`daily-work-log:${account}:sync`, { ifAvailable: true }, async (lock) => { if (lock) await run(); });
      else await run();
    } catch (error) { notify(error instanceof Error ? error.message : "ส่งข้อมูลที่รอไว้ไม่สำเร็จ", "error"); }
    finally { synchronizing.current = false; setSyncing(false); }
  }, [account, notify]);
  useEffect(() => {
    const wake = () => void sync();
    const frame = requestAnimationFrame(wake);
    const timer = setInterval(wake, 15000);
    window.addEventListener("online", wake); window.addEventListener("focus", wake); document.addEventListener("visibilitychange", wake);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); window.removeEventListener("online", wake); window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", wake); };
  }, [sync, raw]);
  const mutate = useCallback(async (request: MutationRequest) => {
    if (!account) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล");
    try {
      const result = await mutateRequest(account, request);
      if (result.queued) notify("เก็บการเปลี่ยนแปลงในอุปกรณ์แล้ว จะส่งเมื่อเชื่อมต่อได้");
      return result;
    } catch (error) { notify(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง", "error"); throw error; }
  }, [account, notify]);
  async function retry() {
    if (!account) return;
    writeQueue(account, queuedRequests(account).map((entry) => ({ ...entry, blocked: undefined })));
    await sync();
  }
  async function discard() {
    if (!account || !window.confirm("ล้างรายการที่ยังส่งไม่สำเร็จจากอุปกรณ์นี้หรือไม่? กรุณาตรวจฉบับร่างก่อนล้าง")) return;
    const pending = queuedRequests(account);
    writeQueue(account, []);
    try { await Promise.all(pending.filter((entry) => entry.blobKey).map((entry) => binaryStore(entry.blobKey!, "delete"))); } catch { notify("ล้างรายการแล้ว แต่ยังล้างไฟล์ชั่วคราวไม่ครบ", "error"); }
    window.dispatchEvent(new Event("daily-work-log:discarded"));
  }
  return <Context.Provider value={{ account, theme, setTheme, entries, notify, mutate }}>{children}
    {account && (!online || entries.length > 0) && <aside className="sync-banner" aria-label="สถานะการเชื่อมต่อ"><p role="status">{!online ? "ออฟไลน์ · ฉบับร่างยังเก็บในอุปกรณ์" : syncing ? "กำลังส่งข้อมูลที่รอไว้…" : `รอส่ง ${entries.length} รายการ`}</p>{entries.length > 0 && <details><summary>ดูรายการรอส่ง</summary><ul>{entries.map((entry) => <li key={entry.id}>{entry.label}{entry.blocked && <strong>{entry.blocked}</strong>}</li>)}</ul><p>หากข้อมูลขัดแย้ง ให้ตรวจข้อมูลล่าสุดก่อนลองใหม่</p><button type="button" className="button button-secondary" disabled={!online || syncing} onClick={() => void retry()}>ลองส่งอีกครั้ง</button><button type="button" className="button button-quiet" disabled={syncing} onClick={() => void discard()}>ล้างรายการรอส่ง</button></details>}</aside>}
    <div className="toast-stack" aria-label="ข้อความแจ้งเตือน">{toasts.map((toast) => <div className={`app-toast toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"} key={toast.id}><span>{toast.message}</span><button type="button" aria-label="ปิดข้อความ" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>×</button></div>)}</div>
  </Context.Provider>;
}
export function useAppRuntime() { const runtime = useContext(Context); if (!runtime) throw new Error("AppRuntime is required"); return runtime; }
export function useErrorToast(message: string) { const { notify } = useAppRuntime(); useEffect(() => { if (message) notify(message, "error"); }, [message, notify]); }
