import "server-only";
import type { sheets_v4 } from "@googleapis/sheets";
import { readRecords, writeRecord } from "@/lib/sheets/record-store";
import { contactToRow, rowToContact } from "@/lib/sheets/contact-file-mapping";
import { readJobStore } from "@/lib/sheets/job-store";
import { JobError } from "@/lib/jobs/service";
import { phoneDigits } from "./search";
import { t } from "@/lib/i18n";
import type { Contact, ContactHistory, ContactInput } from "@/types/contact";
import type { Job } from "@/types/job";

export async function listContacts(): Promise<Contact[]> {
  return (await readRecords("Contacts")).rows.filter((row) => row[0]).map(rowToContact);
}
export function withContactHistory(contacts: Contact[], jobs: Job[]): ContactHistory[] {
  return contacts.map((contact) => {
    const shared = jobs.filter((job) => job.syncStatus !== "delete_pending" && job.teamMemberIds.includes(contact.id));
    return { ...contact, jobCount: shared.length, lastJobDate: shared.map((job) => job.workDate).sort().at(-1) ?? "" };
  }).sort((a, b) => b.lastJobDate.localeCompare(a.lastJobDate) || (a.nickname || a.realName).localeCompare(b.nickname || b.realName, "th"));
}
export async function contactHistory(jobs?: Job[]): Promise<ContactHistory[]> {
  const [contacts, work] = await Promise.all([listContacts(), jobs ? Promise.resolve(jobs) : readJobStore().then((store) => store.jobs)]);
  return withContactHistory(contacts, work);
}
export async function saveContact(id: string, input: ContactInput, version?: string): Promise<Contact> {
  const store = await readRecords("Contacts");
  const contacts = store.rows.filter((row) => row[0]).map(rowToContact);
  const previous = contacts.find((contact) => contact.id === id);
  if (previous && version !== previous.updatedAt) {
    if (previous.phone === input.phone && previous.realName === input.realName && previous.nickname === input.nickname) return previous;
    throw new JobError(409, t.contacts.conflict);
  }
  if (!previous && version) throw new JobError(404, t.contacts.notFound);
  if (contacts.some((contact) => contact.id !== id && phoneDigits(contact.phone) === phoneDigits(input.phone))) throw new JobError(409, t.contacts.duplicate);
  const now = new Date().toISOString();
  const contact = { ...input, id, createdAt: previous?.createdAt ?? now, updatedAt: now };
  await writeRecord(store, id, contactToRow(contact));
  return contact;
}
export async function deleteContact(id: string, version: string) {
  const [store, jobs] = await Promise.all([readRecords("Contacts"), readJobStore()]);
  const index = store.rows.findIndex((row) => row[0] === id);
  if (index < 0) return;
  if (String(store.rows[index][5]) !== version) throw new JobError(409, t.contacts.conflict);
  const now = new Date().toISOString();
  const requests: sheets_v4.Schema$Request[] = [];
  jobs.jobs.forEach((job) => {
    if (!job.teamMemberIds.includes(id)) return;
    const rowIndex = jobs.jobRows.findIndex((row) => row[0] === job.id) + 1;
    requests.push({ updateCells: { start: { sheetId: jobs.sheetIds.get("Jobs"), rowIndex, columnIndex: 19 }, rows: [{ values: [{ userEnteredValue: { stringValue: JSON.stringify(job.teamMemberIds.filter((value) => value !== id)) } }] }], fields: "userEnteredValue" } });
    requests.push({ updateCells: { start: { sheetId: jobs.sheetIds.get("Jobs"), rowIndex, columnIndex: 23 }, rows: [{ values: [{ userEnteredValue: { stringValue: now } }] }], fields: "userEnteredValue" } });
  });
  requests.push({ deleteDimension: { range: { sheetId: store.sheetId, dimension: "ROWS", startIndex: index + 1, endIndex: index + 2 } } });
  await store.client.spreadsheets.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: { requests } });
}
