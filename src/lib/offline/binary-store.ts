const databaseName = "daily-work-log-files";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("ไม่สามารถเก็บไฟล์ในอุปกรณ์นี้ได้"));
  });
}
export async function binaryStore<T>(key: string, action: "get" | "put" | "delete", value?: T): Promise<T | undefined> {
  const db = await database();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction("files", action === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore("files");
      const request = action === "get" ? store.get(key) : action === "put" ? store.put(value, key) : store.delete(key);
      transaction.oncomplete = () => resolve(action === "get" ? request.result as T | undefined : undefined);
      transaction.onerror = () => reject(new Error("พื้นที่อุปกรณ์ไม่พอหรือไม่อนุญาตให้เก็บไฟล์"));
      transaction.onabort = () => reject(new Error("เก็บไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง"));
    });
  } finally { db.close(); }
}
