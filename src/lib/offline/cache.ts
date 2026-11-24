export function readCache<T>(key: string | null, fallback: T): T {
  try { return key ? JSON.parse(localStorage.getItem(key) || "null") as T || fallback : fallback; } catch { return fallback; }
}
export function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("เก็บฉบับร่างไม่ได้ กรุณาเปิดหน้านี้ไว้และตรวจพื้นที่อุปกรณ์"); }
}
