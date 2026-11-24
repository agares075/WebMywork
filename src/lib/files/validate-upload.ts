import "server-only";
import { maxFileBytes } from "./rules";
import { JobError } from "@/lib/jobs/service";
import { t } from "@/lib/i18n";

export async function readUpload(request: Request) {
  if (Number(request.headers.get("content-length")) > maxFileBytes + 65536) throw new JobError(413, t.files.tooLarge);
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) throw new JobError(400, t.files.invalidType);
  if (file.size > maxFileBytes) throw new JobError(413, t.files.tooLarge);
  const bytes = Buffer.from(await file.arrayBuffer());
  let mimeType = "";
  if (bytes.subarray(0, 5).toString() === "%PDF-") mimeType = "application/pdf";
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mimeType = "image/jpeg";
  else if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mimeType = "image/png";
  else if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") mimeType = "image/webp";
  else if (["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString())) mimeType = "image/gif";
  else if (bytes.subarray(4, 8).toString() === "ftyp" && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(bytes.subarray(8, 12).toString())) mimeType = "image/heic";
  if (!mimeType) throw new JobError(400, t.files.invalidType);
  const name = file.name.replace(/[\u0000-\u001f\u007f/\\]/g, "_").trim().slice(0, 180) || "certificate";
  return { id: data.get("id"), bytes, mimeType, name };
}
export type CertificateUpload = Awaited<ReturnType<typeof readUpload>>;
