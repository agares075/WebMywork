import "server-only";
import { initializeSpreadsheet } from "./initialize";
import { getSheetsClient } from "@/lib/google/client";
import { getEnvironment } from "@/lib/env";
import type { SheetRow } from "./job-mapping";

export async function readRecords(name: "Contacts" | "Files") {
  await initializeSpreadsheet();
  const client = await getSheetsClient();
  const spreadsheetId = getEnvironment().GOOGLE_SPREADSHEET_ID;
  const [metadata, result] = await Promise.all([
    client.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" }),
    client.spreadsheets.values.get({ spreadsheetId, range: `'${name}'!A2:${name === "Files" ? "G" : "F"}`, valueRenderOption: "UNFORMATTED_VALUE" })
  ]);
  const sheetId = metadata.data.sheets?.find((sheet) => sheet.properties?.title === name)?.properties?.sheetId;
  const rows = (result.data.values ?? []) as SheetRow[];
  return { client, spreadsheetId, sheetId, rows, name };
}
export type RecordStore = Awaited<ReturnType<typeof readRecords>>;
export async function writeRecord(store: RecordStore, id: string, row: SheetRow) {
  const index = store.rows.findIndex((value) => value[0] === id);
  if (index < 0) {
    await store.client.spreadsheets.values.append({ spreadsheetId: store.spreadsheetId, range: `'${store.name}'!A1`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: [row] } });
  } else {
    await store.client.spreadsheets.values.update({ spreadsheetId: store.spreadsheetId, range: `'${store.name}'!A${index + 2}`, valueInputOption: "RAW", requestBody: { values: [row] } });
  }
}
export async function deleteRecordRows(store: RecordStore, ids: string[]) {
  const indices = store.rows.flatMap((row, index) => ids.includes(String(row[0])) ? [index + 1] : []).reverse();
  if (indices.length) await store.client.spreadsheets.batchUpdate({ spreadsheetId: store.spreadsheetId, requestBody: { requests: indices.map((index) => ({ deleteDimension: { range: { sheetId: store.sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 } } })) } });
}
