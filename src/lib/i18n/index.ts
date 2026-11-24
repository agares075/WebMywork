import { th } from "./th";
import { jobsText } from "./jobs";
import { contactsText, filesText } from "./contacts-files";
import { paymentText, reportsText } from "./reports";

export const locale = "th-TH";
export const timeZone = "Asia/Bangkok";
export const currency = "THB";
export const messages = { th: { ...th, jobs: jobsText, contacts: contactsText, files: filesText, payment: paymentText, reports: reportsText } };
export const t = messages.th;

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(new Date(value));
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}
