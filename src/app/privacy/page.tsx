import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว | Daily Work Log",
  description: "การใช้และจัดเก็บข้อมูลส่วนตัวของแอป Daily Work Log"
};

export default function PrivacyPage() {
  return <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
    <p className="eyebrow muted">Daily Work Log</p>
    <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">นโยบายความเป็นส่วนตัว</h1>
    <div className="mt-6 space-y-4 text-base leading-8">
      <p>Daily Work Log เป็นแอปสำหรับใช้งานส่วนตัวของเจ้าของบัญชีเท่านั้น</p>
      <p>แอปเข้าถึงเฉพาะ Google Sheets, Google Calendar และโฟลเดอร์ Google Drive ของเจ้าของ เพื่อจัดเก็บบันทึกงานและเอกสารที่เกี่ยวข้อง</p>
      <p>ไม่มีการขายหรือแบ่งปันข้อมูลกับบุคคลที่สาม ข้อมูลที่บันทึกแล้วจัดเก็บอยู่ในบัญชี Google ของเจ้าของแอป</p>
      <p className="muted">ฉบับร่างและรายการรอส่งอาจเก็บชั่วคราวในเบราว์เซอร์ของเจ้าของ เพื่อรองรับการใช้งานขณะออฟไลน์</p>
    </div>
    <Link className="button button-secondary mt-8" href="/login">กลับหน้าเข้าสู่ระบบ</Link>
  </main>;
}
