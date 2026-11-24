import "server-only";
import type { sheets_v4 } from "@googleapis/sheets";
import { getSheetsClient } from "@/lib/google/client";
import { getEnvironment } from "@/lib/env";
import { markOverdue } from "@/lib/payments/store";
import { initializeSpreadsheet } from "./initialize";
import { expenseToRow, jobToRow, rowToJob, type SheetRow } from "./job-mapping";
import type { Job } from "@/types/job";

export async function readJobStore() {
  await initializeSpreadsheet();
  const client = await getSheetsClient();
  const spreadsheetId = getEnvironment().GOOGLE_SPREADSHEET_ID;
  const [metadata, values] = await Promise.all([
    client.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" }),
    client.spreadsheets.values.batchGet({ spreadsheetId, ranges: ["'Jobs'!A2:Z", "'Expenses'!A2:F"], valueRenderOption: "UNFORMATTED_VALUE" })
  ]);
  const sheetIds = new Map((metadata.data.sheets ?? []).map((sheet) => [sheet.properties?.title, sheet.properties?.sheetId]));
  const jobRows = (values.data.valueRanges?.[0]?.values ?? []) as SheetRow[];
  const expenseRows = (values.data.valueRanges?.[1]?.values ?? []) as SheetRow[];
  const loadedJobs = jobRows.filter((row) => row[0]).map((row) => rowToJob(row, expenseRows.filter((expense) => expense[1] === row[0]).map((expense) => ({ id: String(expense[0]), label: String(expense[2]), amount: Number(expense[3]) }))));
  const jobs = await markOverdue({ client, spreadsheetId, jobRows }, loadedJobs);
  return { client, spreadsheetId, sheetIds, jobRows, expenseRows, jobs };
}
export type JobStore = Awaited<ReturnType<typeof readJobStore>>;

function cells(row: SheetRow): sheets_v4.Schema$RowData {
  return { values: row.map((value) => ({ userEnteredValue: typeof value === "number" ? { numberValue: value } : typeof value === "boolean" ? { boolValue: value } : { stringValue: value } })) };
}
function expenseDeletes(store: JobStore, id: string): sheets_v4.Schema$Request[] {
  return store.expenseRows.flatMap((row, index) => row[1] === id ? [index + 1] : []).reverse().map((rowIndex) => ({ deleteDimension: { range: { sheetId: store.sheetIds.get("Expenses"), dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }));
}

export async function writeJob(store: JobStore, job: Job) {
  const index = store.jobRows.findIndex((row) => row[0] === job.id);
  const requests: sheets_v4.Schema$Request[] = index >= 0 ? [{ updateCells: { start: { sheetId: store.sheetIds.get("Jobs"), rowIndex: index + 1, columnIndex: 0 }, rows: [cells(jobToRow(job))], fields: "userEnteredValue" } }] : [{ appendCells: { sheetId: store.sheetIds.get("Jobs"), rows: [cells(jobToRow(job))], fields: "userEnteredValue" } }];
  requests.push(...expenseDeletes(store, job.id));
  if (job.expenses.length) requests.push({ appendCells: {
    sheetId: store.sheetIds.get("Expenses"), fields: "userEnteredValue",
    rows: job.expenses.map((expense) => cells(expenseToRow(expense, job, String(store.expenseRows.find((row) => row[0] === expense.id && row[1] === job.id)?.[4] || job.updatedAt))))
  } });
  await store.client.spreadsheets.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: { requests } });
}

export async function updateSyncState(store: JobStore, job: Job) {
  // Re-read row positions because another request may have appended/deleted rows.
  const fresh = await readJobStore();
  const index = fresh.jobRows.findIndex((row) => row[0] === job.id);
  const latest = fresh.jobs.find((value) => value.id === job.id);
  if (index < 0 || latest?.updatedAt !== job.updatedAt || latest.syncStatus === "delete_pending") throw new Error("Job changed during sync");
  await store.client.spreadsheets.values.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: {
    valueInputOption: "RAW", data: [
      { range: `'Jobs'!U${index + 2}:V${index + 2}`, values: [[job.calendarEventId, job.reminderEventId]] },
      { range: `'Jobs'!Y${index + 2}:Z${index + 2}`, values: [[job.reminderEnabled, job.syncStatus]] }
    ]
  } });
}

export async function removeJob(store: JobStore, job: Job) {
  const fresh = await readJobStore();
  const index = fresh.jobRows.findIndex((row) => row[0] === job.id);
  if (index < 0) return;
  const latest = fresh.jobs.find((value) => value.id === job.id);
  if (latest?.updatedAt !== job.updatedAt) throw new Error("Job changed during deletion");
  await store.client.spreadsheets.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: { requests: [
    ...expenseDeletes(fresh, job.id),
    { deleteDimension: { range: { sheetId: fresh.sheetIds.get("Jobs"), dimension: "ROWS", startIndex: index + 1, endIndex: index + 2 } } }
  ] } });
}
