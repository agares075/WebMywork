import { Icon } from "./icon";
import { t } from "@/lib/i18n";

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand${light ? " brand-light" : ""}`}>
    <span className="brand-mark"><Icon name="log" /></span>
    <div><span className="brand-name" lang="en">{t.appName}</span><span className="brand-tagline">{t.tagline}</span></div>
  </div>;
}
