"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppRuntime } from "@/components/ui/app-runtime";

export function DemoPanel() {
  const { entries, notify } = useAppRuntime();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function seed() {
    if (!navigator.onLine) { notify("กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนเพิ่มข้อมูลตัวอย่าง", "error"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เพิ่มข้อมูลตัวอย่างไม่สำเร็จ");
      notify(`เพิ่มงานตัวอย่าง ${data.addedJobs} งาน และผู้ร่วมงาน ${data.addedContacts} คนแล้ว`);
      setConfirm(false);
    } catch (error) { notify(error instanceof Error ? error.message : "เพิ่มข้อมูลตัวอย่างไม่สำเร็จ", "error"); }
    finally { setBusy(false); }
  }
  return <section className="account-card demo-panel"><h2>ข้อมูลตัวอย่าง</h2><p>เพิ่มผู้ร่วมงาน 1 คนและงาน 3 งานลงในชีตนี้ รายการเดิมจะไม่ถูกเขียนทับ</p><p>ข้อมูลตัวอย่างจะยังไม่สร้างกิจกรรมใน Google Calendar</p><button className="button button-secondary" type="button" disabled={busy || entries.length > 0} onClick={() => setConfirm(true)}>เพิ่มข้อมูลตัวอย่าง</button>{confirm && <ConfirmDialog title="เพิ่มข้อมูลตัวอย่างลงในชีตนี้หรือไม่?" description="เหมาะสำหรับสเปรดชีตทดสอบ รายการมีชื่อ [ตัวอย่าง] และลบได้จากหน้าปฏิทิน" confirmLabel="เพิ่มข้อมูลตัวอย่าง" busyLabel="กำลังเพิ่ม…" busy={busy} onClose={() => setConfirm(false)} onConfirm={() => void seed()} />}</section>;
}
