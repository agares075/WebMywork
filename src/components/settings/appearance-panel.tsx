"use client";

import { useAppRuntime } from "@/components/ui/app-runtime";

export function AppearancePanel() {
  const { theme, setTheme } = useAppRuntime();
  return <section className="account-card appearance-panel"><h2>รูปแบบการแสดงผล</h2><fieldset><legend className="sr-only">เลือกธีม</legend>{([ ["system", "ตามอุปกรณ์"], ["light", "สว่าง"], ["dark", "มืด"] ] as const).map(([value, label]) => <label key={value}><input type="radio" name="appearance" value={value} checked={theme === value} onChange={() => setTheme(value)} /><span>{label}</span></label>)}</fieldset></section>;
}
