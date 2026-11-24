import "server-only";
import type { sheets_v4 } from "@googleapis/sheets";
import { ConnectionError } from "./errors";
import { t } from "@/lib/i18n";

// Each anchor spills independently down its column; A:G is app-managed.
const formulas = [
  '=SORT(UNIQUE({(YEAR(TODAY())&"-"&RIGHT("0"&MONTH(TODAY()),2));IFERROR(FILTER(LEFT(Jobs!C2:C,7),Jobs!A2:A<>"",Jobs!Z2:Z<>"delete_pending"),(YEAR(TODAY())&"-"&RIGHT("0"&MONTH(TODAY()),2)))}))',
  '=MAP(A2:A,LAMBDA(month,IF(month="","",ROUND(SUMIFS(Jobs!K2:K,Jobs!C2:C,month&"*",Jobs!Q2:Q,"<>cancelled",Jobs!Z2:Z,"<>delete_pending"),2))))',
  '=MAP(A2:A,LAMBDA(month,IF(month="","",ROUND(SUM(ARRAYFORMULA(IF((Expenses!A2:A<>"")*(LEFT(IFNA(VLOOKUP(Expenses!B2:B,Jobs!A2:Z,3,FALSE),""),7)=month)*(IFNA(VLOOKUP(Expenses!B2:B,Jobs!A2:Z,26,FALSE),"delete_pending")<>"delete_pending"),Expenses!D2:D,0))),2))))',
  '=MAP(A2:A,B2:B,C2:C,LAMBDA(month,income,expenses,IF(month="","",ROUND(income-expenses,2))))',
  '=MAP(A2:A,LAMBDA(month,IF(month="","",ROUND(SUM(ARRAYFORMULA(IF((Jobs!A2:A<>"")*(LEFT(Jobs!C2:C,7)=month)*(Jobs!Q2:Q<>"cancelled")*(Jobs!Q2:Q<>"paid")*(Jobs!Z2:Z<>"delete_pending"),IF(Jobs!K2:K>Jobs!R2:R,Jobs!K2:K-Jobs!R2:R,0),0))),2))))',
  '=IFERROR(SORT(UNIQUE(FILTER(Jobs!B2:B,Jobs!A2:A<>"",Jobs!B2:B<>"",Jobs!Q2:Q<>"cancelled",Jobs!Z2:Z<>"delete_pending"))),"")',
  '=MAP(F2:F,LAMBDA(client,IF(client="","",SUM(ARRAYFORMULA((Jobs!B2:B=client)*(Jobs!A2:A<>"")*(Jobs!Q2:Q<>"cancelled")*(Jobs!Z2:Z<>"delete_pending"))))))'
];
export function summaryRequests(sheetId: number, current: unknown[]): sheets_v4.Schema$Request[] {
  if (current.slice(0, formulas.length).some((value, index) => value !== "" && value != null && value !== formulas[index] && !String(value).startsWith("="))) throw new ConnectionError(t.reports.summaryConflict);
  const requests: sheets_v4.Schema$Request[] = formulas.flatMap((formula, index) => current[index] === formula ? [] : [{ updateCells: {
    start: { sheetId, rowIndex: 1, columnIndex: index },
    rows: [{ values: [{ userEnteredValue: { formulaValue: formula } }] }], fields: "userEnteredValue"
  } }]);
  if (requests.length) {
    const moneyFormat = { type: "NUMBER", pattern: '"฿"#,##0.00;[Red]-"฿"#,##0.00' };
    for (const [column, color] of [[1, { red: .09, green: .39, blue: .28 }], [2, { red: .69, green: .2, blue: .2 }]] as const) {
      requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }, cell: { userEnteredFormat: { numberFormat: moneyFormat, textFormat: { foregroundColor: color } } }, fields: "userEnteredFormat.numberFormat,userEnteredFormat.textFormat.foregroundColor" } });
    }
    requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 5 }, cell: { userEnteredFormat: { numberFormat: moneyFormat } }, fields: "userEnteredFormat.numberFormat" } });
  }
  return requests;
}
