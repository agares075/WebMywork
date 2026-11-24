"use client";

import { useState } from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, t } from "@/lib/i18n";
import type { ConnectionResult } from "@/types/sheets";

export function ConnectionPanel({ initial }: { initial: ConnectionResult }) {
  const [result, setResult] = useState(initial);
  const [pending, setPending] = useState(false);
  async function retry() {
    setPending(true);
    try {
      const response = await fetch("/api/sheets/initialize", { method: "POST", cache: "no-store" });
      if (response.status === 401) {
        setResult({ ok: false, message: t.errors.unauthorized, reconnect: true });
      } else {
        const data: ConnectionResult = await response.json();
        setResult(data);
      }
    } catch {
      setResult({ ok: false, message: t.errors.connection, reconnect: false });
    } finally {
      setPending(false);
    }
  }
  return <section className="connection-card" aria-labelledby="connection-heading" aria-busy={pending}>
    <div className="connection-header">
      <span className="service-icon"><Icon name="sheet" /></span>
      <div><p className="eyebrow muted">GOOGLE SHEETS</p><h2 id="connection-heading">{t.workspace.sheetTitle}</h2></div>
      <span className={`status-badge ${result.ok ? "status-success" : "status-warning"}`}><Icon name={result.ok ? "check" : "refresh"} />{result.ok ? t.workspace.connected : t.workspace.disconnected}</span>
    </div>
    <div aria-live="polite" aria-atomic="true">
      {result.ok ? <>
        <p className="connection-description">{t.workspace.sheetDescription}</p>
        <div className="spreadsheet-name"><Icon name="sheet" /><strong>{result.connection.title}</strong></div>
        <div className="sheet-list">{result.connection.sheets.map((sheet) => <div className="sheet-row" key={sheet.name}>
          <span className="sheet-check"><Icon name="check" /></span>
          <div><strong>{sheet.name}</strong><span>{t.sheets[sheet.name]}</span></div>
          <span className="column-count">{sheet.columns} คอลัมน์</span>
        </div>)}</div>
        <p className="checked-at">{t.workspace.checkedAt} {formatDateTime(result.connection.checkedAt)}</p>
      </> : <div className="notice notice-error" role="alert">{result.message}</div>}
    </div>
    <div className="connection-actions">
      {result.ok && <a className="button button-primary" href={result.connection.url} target="_blank" rel="noopener noreferrer">{t.workspace.openSheet}<Icon name="external" /></a>}
      {!result.ok && result.reconnect && <AuthButton action="signIn" reconnect />}
      <button className="button button-secondary" type="button" onClick={retry} disabled={pending}><Icon name="refresh" className={pending ? "spin" : ""} />{pending ? t.workspace.checking : t.workspace.retry}</button>
    </div>
  </section>;
}
