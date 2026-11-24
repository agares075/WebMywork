import { AuthButton } from "./auth-button";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { t } from "@/lib/i18n";

export function LoginScreen({ missingFields, error }: { missingFields: string[]; error?: string }) {
  return <main className="login-layout">
    <section className="welcome-panel">
      <Brand light />
      <div className="welcome-copy">
        <span className="eyebrow welcome-eyebrow"><span className="tiny-line" />{t.login.eyebrow}</span>
        <h1>{t.login.title}</h1>
        <p>{t.login.description}</p>
        <div className="notebook" aria-hidden="true">
          <div className="notebook-top"><span>DAILY WORK LOG</span><Icon name="sun" /></div>
          <div className="notebook-line" /><div className="notebook-line short" />
          <div className="notebook-bottom"><span className="notebook-check"><Icon name="check" /></span><span>วันทำงานที่เป็นระเบียบ เริ่มที่นี่</span></div>
        </div>
      </div>
      <div className="welcome-footer"><Icon name="lock" /><span>{t.workspace.private}</span><span className="footer-divider" />{t.workspace.timezone}</div>
    </section>
    <section className="login-content" aria-labelledby="login-heading">
      <div className="login-card">
        <span className="login-symbol"><Icon name="log" /></span>
        <p className="eyebrow muted">LET’S GET STARTED</p>
        <h2 id="login-heading">{t.login.welcome}</h2>
        <p className="login-instruction">{t.login.instruction}</p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {missingFields.length > 0 && <div className="notice notice-setup">
          <strong>{t.login.setup}</strong>
          <p>{t.login.setupDescription}</p>
          <ul className="configuration-list">{missingFields.map((field) => <li key={field}><code>{field}</code></li>)}</ul>
        </div>}
        <AuthButton action="signIn" disabled={missingFields.length > 0} />
        <div className="login-notes">
          <p><Icon name="shield" /><span>{t.login.privacy}</span></p>
          <p><Icon name="sheet" /><span>{t.login.storage}</span></p>
        </div>
      </div>
      <p className="login-footer">{t.appName}<span>·</span>พื้นที่สำหรับทุกวันทำงาน</p>
    </section>
  </main>;
}
