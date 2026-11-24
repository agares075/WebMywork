export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function bangkokDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function bangkokNow(): string {
  const now = new Date();
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return `${bangkokDate(now)}T${time}`;
}

export function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.round(Math.max(0, (new Date(`${end}+07:00`).valueOf() - new Date(`${start}+07:00`).valueOf()) / 3600000) * 100) / 100;
}

export function sumMoney(amounts: number[]): number {
  return amounts.reduce((total, value) => total + Math.round(value * 100), 0) / 100;
}

export function paymentCountdown(expected: string, today: string): string {
  const days = Math.round((new Date(`${expected}T00:00:00Z`).valueOf() - new Date(`${today}T00:00:00Z`).valueOf()) / 86400000);
  return days === 0 ? "ครบกำหนดวันนี้" : days > 0 ? `อีก ${days} วัน` : `เลยกำหนด ${-days} วัน`;
}
