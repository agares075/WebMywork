import { localFileType, maxFileBytes } from "./rules";

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const image = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: image, width: image.width, height: image.height, close: () => image.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const image = new Image();
    try { image.src = url; await image.decode(); return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) }; }
    catch { URL.revokeObjectURL(url); throw new Error("อุปกรณ์นี้ย่อรูปไม่ได้ กรุณาเลือกไฟล์ JPEG/PNG ที่มีขนาดเล็กลง"); }
  }
}
export async function prepareCertificate(file: File): Promise<File> {
  const mime = localFileType(file);
  if (!mime || file.size === 0) throw new Error("รองรับเฉพาะ PDF หรือรูปภาพ");
  if (mime === "application/pdf") {
    if (file.size > maxFileBytes) throw new Error("PDF ต้องมีขนาดไม่เกิน 4 MB");
    return file;
  }
  if (file.size > 32 * 1024 * 1024) throw new Error("รูปต้นฉบับใหญ่เกินไป กรุณาเลือกรูปที่เล็กกว่า 32 MB");
  let image: Awaited<ReturnType<typeof decode>>;
  try { image = await decode(file); }
  catch (error) { if (file.size <= maxFileBytes) return file; throw error; }
  const canvas = document.createElement("canvas");
  try {
    if (file.size <= 1024 * 1024 && Math.max(image.width, image.height) <= 2200) return file;
    let longest = Math.min(2200, Math.max(image.width, image.height));
    for (let scale = 0; scale < 5; scale++) {
      const ratio = Math.min(1, longest / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("อุปกรณ์นี้ไม่รองรับการย่อรูป");
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [.86, .74, .62]) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("บีบอัดรูปไม่สำเร็จ")), "image/jpeg", quality));
        if (blob.size <= 1024 * 1024 || (scale === 4 && blob.size <= maxFileBytes)) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
      }
      longest = Math.round(longest * .75);
    }
    throw new Error("ย่อรูปให้ต่ำกว่า 4 MB ไม่สำเร็จ กรุณาเลือกรูปใหม่");
  } finally { image.close(); canvas.width = 0; canvas.height = 0; }
}
