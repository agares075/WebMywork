import type { ContactInput } from "@/types/contact";

function normalize(value: string) {
  return value.normalize("NFKC").replace(/[๐-๙]/g, (digit) => String(digit.charCodeAt(0) - 0x0e50)).toLocaleLowerCase("th-TH");
}
export function phoneDigits(value: string): string { return normalize(value).replace(/\D/g, ""); }
export function contactMatches(contact: ContactInput, query: string): boolean {
  const term = normalize(query).trim();
  if (!term) return true;
  if (/^[+\d\s().-]+$/.test(term)) return phoneDigits(contact.phone).includes(phoneDigits(term));
  return term.split(/\s+/).every((word) => normalize(`${contact.realName} ${contact.nickname} ${contact.phone}`).includes(word));
}
