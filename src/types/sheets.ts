export type SheetName = "Jobs" | "Expenses" | "Contacts" | "Files" | "Summary";

export type SheetsConnection = {
  title: string;
  url: string;
  sheets: { name: SheetName; columns: number }[];
  checkedAt: string;
};

export type ConnectionResult =
  | { ok: true; connection: SheetsConnection }
  | { ok: false; message: string; reconnect: boolean };
