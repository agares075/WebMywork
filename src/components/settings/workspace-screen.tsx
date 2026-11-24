import Link from "next/link";
import { AppNav } from "@/components/ui/app-nav";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { AuthButton } from "@/components/auth/auth-button";
import { AppearancePanel } from "./appearance-panel";
import { DemoPanel } from "./demo-panel";
import { ConnectionPanel } from "./connection-panel";
import { t } from "@/lib/i18n";
import type { ConnectionResult } from "@/types/sheets";

export function WorkspaceScreen({ email, initial, demoEnabled = false }: { email: string; initial: ConnectionResult; demoEnabled?: boolean }) {
  return <div className="workspace-layout">
    <header className="app-header"><div className="header-inner"><Brand /><AuthButton action="signOut" /></div></header>
    <AppNav active="settings" />
    <main className="workspace-main settings-main">
      <div className="page-intro"><p className="eyebrow muted">{t.workspace.eyebrow}</p><h1>{t.workspace.title}</h1><p>{t.workspace.description}</p></div>
      <div className="workspace-grid">
        <ConnectionPanel initial={initial} />
        <aside className="workspace-aside">
          <AppearancePanel />{demoEnabled && <DemoPanel />}
          <section className="account-card"><span className="account-icon"><Icon name="shield" /></span><p className="eyebrow muted">{t.workspace.account}</p><strong className="account-email">{email}</strong><p className="account-note"><Icon name="lock" />{t.workspace.private}</p><AuthButton action="signIn" reconnect /></section>
          <section className="next-card"><span className="next-label">{t.workspace.foundation}</span><h2><Link href="/">{t.jobs.calendar}</Link></h2><p>เปิดปฏิทินเพื่อเพิ่มและจัดการงานประจำวัน</p></section>
        </aside>
      </div>
    </main>
    <footer className="workspace-footer"><span>{t.appName}</span><span>{t.workspace.timezone}</span></footer>
  </div>;
}
