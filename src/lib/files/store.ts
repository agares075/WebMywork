import "server-only";
import { readRecords } from "@/lib/sheets/record-store";
import { rowToFile } from "@/lib/sheets/contact-file-mapping";

export async function readFileStore() {
  const store = await readRecords("Files");
  return { ...store, files: store.rows.filter((row) => row[0]).map(rowToFile) };
}
