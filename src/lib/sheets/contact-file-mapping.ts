import type { Contact } from "../../types/contact";
import type { JobFile } from "../../types/file";
import type { SheetRow } from "./job-mapping";

export function contactToRow(contact: Contact): SheetRow {
  return [contact.id, contact.phone, contact.realName, contact.nickname, contact.createdAt, contact.updatedAt];
}
export function rowToContact(row: SheetRow): Contact {
  return { id: String(row[0]), phone: String(row[1] ?? ""), realName: String(row[2] ?? ""), nickname: String(row[3] ?? ""), createdAt: String(row[4] ?? ""), updatedAt: String(row[5] ?? "") };
}
export function fileToRow(file: JobFile): SheetRow {
  return [file.id, file.jobId, file.driveFileId, file.name, file.mimeType, file.url, file.createdAt];
}
export function rowToFile(row: SheetRow): JobFile {
  return { id: String(row[0]), jobId: String(row[1]), driveFileId: String(row[2]), name: String(row[3]), mimeType: String(row[4]), url: String(row[5]), createdAt: String(row[6]) };
}
