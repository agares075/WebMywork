"use client";

import { useErrorToast } from "./app-runtime";

export function ErrorScreen({ reset }: { reset: () => void }) {
  useErrorToast("เปิดพื้นที่ทำงานไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่");
  return <main className="message-screen"><h1>เปิดพื้นที่ทำงานไม่สำเร็จ</h1><p>กรุณาลองอีกครั้ง หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p><button className="button button-primary" onClick={reset}>ลองอีกครั้ง</button></main>;
}
