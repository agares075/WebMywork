"use client";

import { useState } from "react";
import { FormSection, InputField } from "@/components/ui/form-field";
import { monthDays, shiftMonth, formatDay } from "@/lib/calendar";
import { dateRange, toggleDate, type MultiDayDraft } from "@/lib/jobs/multi-day";
import { bangkokDate } from "@/lib/calculations";

type Selection = Pick<MultiDayDraft, "dates" | "mode" | "rangeStart" | "rangeEnd">;
export function MultiDatePicker({ value, onChange }: { value: Selection; onChange: (value: Selection) => void }) {
  const [month, setMonth] = useState(value.dates[0] || bangkokDate());
  const [error, setError] = useState("");
  function range(start: string, end: string) {
    try {
      const dates = start && end ? dateRange(start, end) : start ? [start] : [];
      onChange({ ...value, rangeStart: start, rangeEnd: end, dates }); setError("");
    } catch (reason) { setError((reason as Error).message); }
  }
  function pick(date: string) {
    try {
      if (value.mode === "individual") onChange({ ...value, dates: toggleDate(value.dates, date) });
      else if (!value.rangeStart || value.rangeEnd) range(date, "");
      else range(date < value.rangeStart ? date : value.rangeStart, date < value.rangeStart ? value.rangeStart : date);
      setError("");
    } catch (reason) { setError((reason as Error).message); }
  }
  return <FormSection title="เลือกวันทำงาน"><div className="view-tabs multi-date-modes" role="group" aria-label="วิธีเลือกวันที่"><button type="button" aria-pressed={value.mode === "range"} onClick={() => onChange({ ...value, mode: "range", dates: [], rangeStart: "", rangeEnd: "" })}>ช่วงวันที่</button><button type="button" aria-pressed={value.mode === "individual"} onClick={() => onChange({ ...value, mode: "individual" })}>เลือกวันเอง</button></div>
    {value.mode === "range" && <div className="field-grid"><InputField id="range-start" label="วันเริ่มต้น" type="date" value={value.rangeStart} onValue={(date) => range(date, value.rangeEnd && value.rangeEnd >= date ? value.rangeEnd : "")} /><InputField id="range-end" label="วันสิ้นสุด" type="date" min={value.rangeStart} value={value.rangeEnd} onValue={(date) => range(value.rangeStart, date)} /></div>}
    <p className="field-help">{value.mode === "range" ? "แตะวันเริ่ม แล้วแตะวันสิ้นสุด (สูงสุด 31 วัน)" : "แตะเพื่อเลือกหรือยกเลิกแต่ละวัน (สูงสุด 31 วัน)"} · เวลาไทย</p>
    <div className="multi-date-heading"><button type="button" className="button button-quiet" aria-label="เดือนก่อน" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button><strong>{formatDay(month, { month: "long", year: "numeric" })}</strong><button type="button" className="button button-quiet" aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))}>›</button></div>
    <div className="multi-date-grid" role="group" aria-label="วันที่ทำงาน">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((day) => <span className="multi-weekday" key={day}>{day}</span>)}{monthDays(month).map((date) => <button key={date} type="button" aria-label={formatDay(date)} aria-pressed={value.dates.includes(date)} aria-current={date === bangkokDate() ? "date" : undefined} className={date.slice(0, 7) !== month.slice(0, 7) ? "outside-month" : ""} onClick={() => pick(date)}>{Number(date.slice(-2))}</button>)}</div>
    <div className="multi-date-count"><strong aria-live="polite">เลือกแล้ว {value.dates.length} วัน</strong><button type="button" className="button button-quiet" onClick={() => { onChange({ ...value, dates: [], rangeStart: "", rangeEnd: "" }); setError(""); }}>ล้าง</button></div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
  </FormSection>;
}
