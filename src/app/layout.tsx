import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppRuntime } from "@/components/ui/app-runtime";
import { ThemeScript } from "@/components/ui/theme-script";
import { getAllowedSession } from "@/lib/auth/session";
import { getConfiguration } from "@/lib/env";
import { t } from "@/lib/i18n";
import "@/components/ui/globals.css";
import "@/components/calendar/calendar.css";
import "@/components/jobs/jobs.css";
import "@/components/jobs/multi-day.css";
import "@/components/contacts/contacts.css";
import "@/components/files/files.css";
import "@/components/dashboard/dashboard.css";
import "@/components/ui/finish.css";

export const metadata: Metadata = {
  title: t.appName,
  description: "พื้นที่ส่วนตัวสำหรับบันทึกงานฟรีแลนซ์และจัดการวันทำงาน",
  robots: { index: false, follow: false }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#143e36" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = getConfiguration().success ? await getAllowedSession() : null;
  return <html lang="th" suppressHydrationWarning><head><ThemeScript /></head><body><AppRuntime account={session?.user?.email ?? null}>{children}</AppRuntime></body></html>;
}
