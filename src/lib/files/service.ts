import "server-only";
import { readFileStore } from "./store";
import { writeRecord, deleteRecordRows } from "@/lib/sheets/record-store";
import { fileToRow } from "@/lib/sheets/contact-file-mapping";
import { readJobStore } from "@/lib/sheets/job-store";
import { uploadDriveFile, trashDriveFile, driveFileContent, driveStatus } from "@/lib/google/drive";
import { JobError } from "@/lib/jobs/service";
import { isCertificateType, maxFileBytes, maxJobFiles } from "./rules";
import { t } from "@/lib/i18n";
import type { CertificateUpload } from "./validate-upload";
import type { JobFile } from "@/types/file";

export async function listJobFiles(jobId: string): Promise<JobFile[]> {
  return (await readFileStore()).files.filter((file) => file.jobId === jobId);
}
export async function saveJobFile(jobId: string, id: string, upload: CertificateUpload, replace = false): Promise<JobFile> {
  const [store, work] = await Promise.all([readFileStore(), readJobStore()]);
  const job = work.jobs.find((value) => value.id === jobId);
  if (!job || job.syncStatus === "delete_pending") throw new JobError(409, t.files.noJob);
  const previous = store.files.find((file) => file.id === id);
  if (previous && previous.jobId !== jobId) throw new JobError(404, t.files.notFound);
  if (replace && !previous) throw new JobError(404, t.files.notFound);
  if (!previous && store.files.filter((file) => file.jobId === jobId).length >= maxJobFiles) throw new JobError(400, t.files.maxFiles);
  const drive = await uploadDriveFile(upload, id, jobId, previous?.driveFileId);
  const file = { id, jobId, driveFileId: drive.id, name: drive.name, mimeType: drive.mimeType, url: drive.webViewLink || `https://drive.google.com/file/d/${drive.id}/view`, createdAt: previous?.createdAt || new Date().toISOString() };
  // Upload IDs in Drive appProperties allow a failed Sheets write to be retried.
  const fresh = await readFileStore();
  await writeRecord(fresh, id, fileToRow(file));
  return file;
}
export async function deleteJobFile(jobId: string, id: string) {
  const store = await readFileStore();
  const file = store.files.find((value) => value.id === id && value.jobId === jobId);
  if (!file) return;
  await trashDriveFile(file.driveFileId);
  await deleteRecordRows(await readFileStore(), [id]);
}
export async function previewJobFile(jobId: string, id: string): Promise<Response> {
  const file = (await readFileStore()).files.find((value) => value.id === id && value.jobId === jobId);
  if (!file) throw new JobError(404, t.files.notFound);
  try {
    const { bytes, metadata } = await driveFileContent(file.driveFileId);
    if (!isCertificateType(metadata.mimeType) || bytes.byteLength > maxFileBytes) throw new JobError(400, t.files.invalidType);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": metadata.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(metadata.name).replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'"
    } });
  } catch (error) {
    if ([404, 410].includes(driveStatus(error) ?? 0)) throw new JobError(404, t.files.notFound);
    throw error;
  }
}
