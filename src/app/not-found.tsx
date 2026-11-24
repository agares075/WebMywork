import Link from "next/link";

export default function NotFound() {
  return <main className="message-screen"><h1>ไม่พบหน้านี้</h1><p>กลับไปยังพื้นที่ทำงานของคุณเพื่อเริ่มต้นใหม่</p><Link className="button button-primary" href="/">กลับหน้าหลัก</Link></main>;
}
