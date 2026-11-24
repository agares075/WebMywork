import { addDays } from "./calculations";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
export function monthDays(date: string): string[] {
  const first = `${date.slice(0, 7)}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => addDays(first, index - weekday));
}
export function weekDays(date: string): string[] {
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => addDays(date, index - weekday));
}
export function shiftMonth(date: string, offset: number): string {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
}
export function formatDay(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return new Intl.DateTimeFormat("th-TH", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
