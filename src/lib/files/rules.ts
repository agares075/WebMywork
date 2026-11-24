export const maxFileBytes = 4 * 1024 * 1024;
export const maxJobFiles = 20;
export const certificateTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"] as const;
export const certificateAccept = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,application/pdf,image/*";
export function isCertificateType(value: string): boolean { return (certificateTypes as readonly string[]).includes(value); }
export function localFileType(file: { type: string; name: string }): string {
  if (isCertificateType(file.type)) return file.type;
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const types: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif" };
  return types[extension] || "";
}
