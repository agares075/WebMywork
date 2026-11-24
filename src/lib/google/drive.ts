import "server-only";
import { randomUUID } from "node:crypto";
import { getGoogleAuth } from "./client";
import { getEnvironment } from "@/lib/env";
import { ConnectionError } from "@/lib/sheets/errors";
import { t } from "@/lib/i18n";
import type { CertificateUpload } from "@/lib/files/validate-upload";

const baseUrl = "https://www.googleapis.com/drive/v3/files";
type DriveFile = { id: string; name: string; mimeType: string; webViewLink?: string; trashed?: boolean };
export function driveStatus(error: unknown) { return (error as { response?: { status?: number } } | null)?.response?.status; }
async function client() {
  const auth = await getGoogleAuth();
  return { async request<T>(options: Parameters<typeof auth.request<T>>[0]) {
    try { return await auth.request<T>(options); }
    catch (error) {
      if ([401, 403].includes(driveStatus(error) ?? 0)) throw new ConnectionError(t.files.permission, true);
      throw error;
    }
  } };
}
async function certificateFolder() {
  const auth = await client();
  const sheet = getEnvironment().GOOGLE_SPREADSHEET_ID;
  const result = await auth.request<{ files: { id: string }[] }>({ url: baseUrl, method: "GET", params: { q: `trashed = false and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='dailyWorkLogSheetId' and value='${sheet}' } and appProperties has { key='dailyWorkLogKind' and value='certificates' }`, fields: "files(id)", pageSize: 1 } });
  if (result.data.files[0]) return result.data.files[0].id;
  const folder = await auth.request<{ id: string }>({ url: baseUrl, method: "POST", data: { name: "Daily Work Log – ใบทวิ 50", mimeType: "application/vnd.google-apps.folder", appProperties: { dailyWorkLogSheetId: sheet, dailyWorkLogKind: "certificates" } }, params: { fields: "id" } });
  return folder.data.id;
}
export async function findUploadedFile(id: string): Promise<DriveFile | undefined> {
  const auth = await client();
  const sheet = getEnvironment().GOOGLE_SPREADSHEET_ID;
  const result = await auth.request<{ files: DriveFile[] }>({ url: baseUrl, method: "GET", params: { q: `trashed = false and appProperties has { key='dailyWorkLogUploadId' and value='${id}' } and appProperties has { key='dailyWorkLogSheetId' and value='${sheet}' }`, fields: "files(id,name,mimeType,webViewLink)", pageSize: 1 } });
  return result.data.files[0];
}
export async function uploadDriveFile(upload: CertificateUpload, id: string, jobId: string, previousId?: string): Promise<DriveFile> {
  const auth = await client();
  const existing = previousId || (await findUploadedFile(id))?.id;
  const metadata = { name: upload.name, mimeType: upload.mimeType, ...(!existing ? { parents: [await certificateFolder()] } : {}), appProperties: { dailyWorkLogUploadId: id, dailyWorkLogJobId: jobId, dailyWorkLogSheetId: getEnvironment().GOOGLE_SPREADSHEET_ID } };
  const boundary = `daily-work-log-${randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${upload.mimeType}\r\n\r\n`),
    upload.bytes, Buffer.from(`\r\n--${boundary}--`)
  ]);
  const result = await auth.request<DriveFile>({ url: `https://www.googleapis.com/upload/drive/v3/files${existing ? `/${encodeURIComponent(existing)}` : ""}`, method: existing ? "PATCH" : "POST", params: { uploadType: "multipart", fields: "id,name,mimeType,webViewLink" }, headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, data: body });
  return result.data;
}
export async function trashDriveFile(id: string) {
  const auth = await client();
  try { await auth.request({ url: `${baseUrl}/${encodeURIComponent(id)}`, method: "PATCH", data: { trashed: true } }); }
  catch (error) { if (![404, 410].includes(driveStatus(error) ?? 0)) throw error; }
}
export async function driveFileContent(id: string) {
  const auth = await client();
  const metadata = await auth.request<DriveFile>({ url: `${baseUrl}/${encodeURIComponent(id)}`, method: "GET", params: { fields: "id,name,mimeType,trashed" } });
  if (metadata.data.trashed) throw new ConnectionError(t.files.notFound);
  const response = await auth.request<ArrayBuffer>({ url: `${baseUrl}/${encodeURIComponent(id)}`, method: "GET", params: { alt: "media" }, responseType: "arraybuffer" });
  return { bytes: Buffer.from(response.data), metadata: metadata.data };
}
