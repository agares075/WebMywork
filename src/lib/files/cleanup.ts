import "server-only";
import { readFileStore } from "./store";
import { trashDriveFile } from "@/lib/google/drive";
import { deleteRecordRows } from "@/lib/sheets/record-store";

export async function deleteJobFiles(jobId: string) {
  const store = await readFileStore();
  const files = store.files.filter((file) => file.jobId === jobId);
  for (const file of files) await trashDriveFile(file.driveFileId);
  const fresh = await readFileStore();
  await deleteRecordRows(fresh, files.map((file) => file.id));
}
