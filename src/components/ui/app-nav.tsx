import Link from "next/link";
import { t } from "@/lib/i18n";
import { Icon } from "./icon";

export function AppNav({ active }: { active: "calendar" | "dashboard" | "contacts" | "settings" }) {
  return <nav className="work-nav" aria-label="เมนูหลัก"><Link href="/" aria-current={active === "calendar" ? "page" : undefined}><Icon name="log" />{t.jobs.calendar}</Link><Link href="/dashboard" aria-current={active === "dashboard" ? "page" : undefined}><Icon name="chart" />รายงาน</Link><Link href="/contacts" aria-current={active === "contacts" ? "page" : undefined}><Icon name="users" />{t.contacts.title}</Link><Link href="/settings" aria-current={active === "settings" ? "page" : undefined}><Icon name="sheet" />{t.jobs.settings}</Link></nav>;
}
