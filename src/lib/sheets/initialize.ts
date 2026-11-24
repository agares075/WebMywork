import "server-only";
import { randomInt } from "node:crypto";
import type { sheets_v4 } from "@googleapis/sheets";
import { getSheetsClient } from "@/lib/google/client";
import { getEnvironment } from "@/lib/env";
import { t } from "@/lib/i18n";
import { ConnectionError } from "./errors";
import { summaryRequests } from "./summary";
import { sheetHeaders, sheetNames } from "./schema";
import type { SheetName, SheetsConnection } from "@/types/sheets";

export async function initializeSpreadsheet(): Promise<SheetsConnection> {
  const client = await getSheetsClient();
  const spreadsheetId = getEnvironment().GOOGLE_SPREADSHEET_ID;
  const { data } = await client.spreadsheets.get({
    spreadsheetId,
    fields: "spreadsheetUrl,properties(title,timeZone),sheets(properties(sheetId,title))"
  });
  const existing = new Map((data.sheets ?? []).map((sheet) => [sheet.properties?.title, sheet.properties?.sheetId]));
  const present = sheetNames.filter((name) => existing.has(name));
  const rows = present.length ? await client.spreadsheets.values.batchGet({
    spreadsheetId,
    valueRenderOption: "FORMULA",
    ranges: present.map((name) => `'${name}'!1:2`)
  }) : null;
  const empty = new Set<SheetName>();
  const extensions = new Map<SheetName, number>();
  present.forEach((name, index) => {
    const values = rows?.data.valueRanges?.[index]?.values ?? [];
    const firstRow: unknown[] = values[0] ?? [];
    const hasHeaders = firstRow.some((value) => value !== "" && value != null);
    if (!hasHeaders) {
      if (values[1]?.some((value: unknown) => value !== "" && value != null)) {
        throw new ConnectionError(t.errors.headers);
      }
      empty.add(name);
    } else if (((name === "Jobs" && firstRow.length >= 24) || (name === "Summary" && firstRow.length >= 5)) && firstRow.length < sheetHeaders[name].length &&
      firstRow.every((header, column) => header === sheetHeaders[name][column])) {
      extensions.set(name, firstRow.length);
    } else if (firstRow.length !== sheetHeaders[name].length ||
      sheetHeaders[name].some((header, column) => firstRow[column] !== header)) {
      throw new ConnectionError(t.errors.headers);
    }
  });

  const usedIds = new Set(existing.values());
  const requests: sheets_v4.Schema$Request[] = [];
  if (data.properties?.timeZone !== "Asia/Bangkok") requests.push({ updateSpreadsheetProperties: { properties: { timeZone: "Asia/Bangkok" }, fields: "timeZone" } });
  for (const name of sheetNames) {
    let sheetId = existing.get(name);
    const missing = !existing.has(name);
    if (missing) {
      do { sheetId = randomInt(1, 2_000_000_000); } while (usedIds.has(sheetId));
      usedIds.add(sheetId);
      requests.push({ addSheet: { properties: { sheetId, title: name, gridProperties: { frozenRowCount: 1 } } } });
    }
    if (name === "Summary") {
      if (sheetId == null) throw new Error("Missing Summary sheet ID");
      const current = rows?.data.valueRanges?.[present.indexOf(name)]?.values?.[1] ?? [];
      requests.push(...summaryRequests(sheetId, current));
    }
    const extensionStart = extensions.get(name);
    if (extensionStart !== undefined) {
      requests.push({ updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: extensionStart },
        rows: [{ values: sheetHeaders[name].slice(extensionStart).map((header) => ({ userEnteredValue: { stringValue: header } })) }],
        fields: "userEnteredValue"
      } });
    }
    if (missing || empty.has(name)) {
      requests.push({ updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{ values: sheetHeaders[name].map((header) => ({
          userEnteredValue: { stringValue: header },
          userEnteredFormat: {
            backgroundColor: { red: 0.07, green: 0.22, blue: 0.19 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
          }
        })) }],
        fields: "userEnteredValue,userEnteredFormat"
      } });
      requests.push({ updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount"
      } });
    }
  }
  // Add tabs and their headers atomically; existing rows and formulas are preserved.
  if (requests.length) await client.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  return {
    title: data.properties?.title ?? "Daily Work Log",
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: sheetNames.map((name) => ({ name, columns: sheetHeaders[name].length })),
    checkedAt: new Date().toISOString()
  };
}
