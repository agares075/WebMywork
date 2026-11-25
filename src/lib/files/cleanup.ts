import "server-only";
import { readFileStore } from "./store";
import { trashDriveFile } from "@/lib/google/drive";
import { deleteRecordRows } from "@/lib/sheets/record-store";

export async function deleteJobFiles(jobId: string) { return deleteManyJobFiles([jobId]); }
export async function deleteManyJobFiles(jobIds: string[]) {
  const store = await readFileStore();
  const files = store.files.filter((file) => jobIds.includes(file.jobId));
  for (const file of files) await trashDriveFile(file.driveFileId);
  if (!files.length) return;
  const fresh = await readFileStore();
  await deleteRecordRows(fresh, files.map((file) => file.id));
}
