import "server-only";
import { readJobStore, writeJob } from "@/lib/sheets/job-store";
import { readRecords, writeRecord } from "@/lib/sheets/record-store";
import { contactToRow } from "@/lib/sheets/contact-file-mapping";
import { buildJob } from "@/lib/sheets/job-mapping";
import { emptyJob } from "@/lib/jobs/defaults";
import { addDays, bangkokDate } from "@/lib/calculations";
import { shiftMonth } from "@/lib/calendar";

export async function seedDemoData() {
  const now = new Date().toISOString();
  const contacts = await readRecords("Contacts");
  const contactId = "11111111-1111-4111-8111-111111111111";
  let addedContacts = 0;
  if (!contacts.rows.some((row) => row[0] === contactId)) {
    await writeRecord(contacts, contactId, contactToRow({ id: contactId, phone: "0000000001", realName: "ผู้ร่วมงานตัวอย่าง", nickname: "ทีมเดโม", createdAt: now, updatedAt: now }));
    addedContacts++;
  }
  const today = bangkokDate();
  const samples = [
    { id: "22222222-2222-4222-8222-222222222222", date: today, client: "[ตัวอย่าง] งานอีเวนต์", income: 2500, expense: 180, credit: 7, paid: 0 },
    { id: "33333333-3333-4333-8333-333333333333", date: addDays(today, -14), client: "[ตัวอย่าง] งานถ่ายภาพ", income: 1800, expense: 300, credit: 7, paid: 400 },
    { id: "44444444-4444-4444-8444-444444444444", date: shiftMonth(today, -1), client: "[ตัวอย่าง] งานประชุม", income: 3200, expense: 250, credit: 14, paid: 3200 }
  ];
  let addedJobs = 0;
  for (const sample of samples) {
    const store = await readJobStore();
    if (store.jobs.some((job) => job.id === sample.id)) continue;
    const job = buildJob(sample.id, { ...emptyJob(sample.date), client: sample.client, details: "ข้อมูลตัวอย่างสำหรับทดสอบ สามารถแก้ไขหรือลบได้", location: "กรุงเทพมหานคร", income: sample.income, creditDays: sample.credit, teamMemberIds: [contactId], expenses: [{ id: `${sample.id.slice(0, 8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`, label: "ค่าเดินทางตัวอย่าง", amount: sample.expense }] });
    job.paidAmount = sample.paid;
    job.paymentStatus = sample.paid === sample.income ? "paid" : sample.paid > 0 ? "overdue" : "waiting_for_payment";
    job.paidDate = sample.paid > 0 ? addDays(sample.date, 7) : "";
    await writeJob(store, job);
    addedJobs++;
  }
  return { addedJobs, addedContacts };
}
