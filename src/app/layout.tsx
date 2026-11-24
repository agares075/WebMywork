import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import "@/components/ui/globals.css";
import "@/components/calendar/calendar.css";
import "@/components/jobs/jobs.css";
import "@/components/contacts/contacts.css";
import "@/components/files/files.css";
import "@/components/dashboard/dashboard.css";

export const metadata: Metadata = {
  title: t.appName,
  description: "พื้นที่ส่วนตัวสำหรับบันทึกงานฟรีแลนซ์และจัดการวันทำงาน",
  robots: { index: false, follow: false }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#143e36" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="th"><body>{children}</body></html>;
}
