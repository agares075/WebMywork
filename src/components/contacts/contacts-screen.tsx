"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppRuntime, useErrorToast } from "@/components/ui/app-runtime";
import { mutationEvent, overlayContacts } from "@/lib/offline/store";
import type { MutationEvent } from "@/types/offline";
import { Brand } from "@/components/ui/brand";
import { AuthButton } from "@/components/auth/auth-button";
import { AppNav } from "@/components/ui/app-nav";
import { InputField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContactEditor } from "./contact-editor";
import { contactMatches } from "@/lib/contacts/search";
import { formatDay } from "@/lib/calendar";
import { t } from "@/lib/i18n";
import type { Contact, ContactHistory } from "@/types/contact";

export function ContactsScreen({ initialContacts, initialError = "" }: { initialContacts: ContactHistory[]; initialError?: string }) {
  const { account, entries, mutate } = useAppRuntime();
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const visible = useMemo(() => overlayContacts(contacts, entries).filter((contact) => contactMatches(contact, query)), [contacts, entries, query]);
  useErrorToast(error);
  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/contacts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.contacts.failed);
      setContacts(data.contacts);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.contacts.failed); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => {
    const synced = (event: Event) => { const detail = (event as CustomEvent<MutationEvent>).detail; if (detail.account === account && detail.entry.entity.startsWith("contact:")) void refresh(); };
    const reload = () => { if (navigator.onLine) void refresh(); };
    window.addEventListener(mutationEvent, synced); window.addEventListener("daily-work-log:discarded", reload); return () => { window.removeEventListener(mutationEvent, synced); window.removeEventListener("daily-work-log:discarded", reload); };
  }, [account, refresh]);
  function saved(contact: Contact) {
    setContacts((current) => {
      const previous = current.find((value) => value.id === contact.id);
      const value = { ...contact, jobCount: previous?.jobCount || 0, lastJobDate: previous?.lastJobDate || "" };
      return previous ? current.map((item) => item.id === contact.id ? value : item) : [value, ...current];
    });
    setEditing(null); setMessage(t.contacts.saved); setError("");
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true); setError("");
    try {
      await mutate({ url: `/api/contacts/${deleting.id}`, method: "DELETE", entity: `contact:${deleting.id}`, label: `ลบผู้ร่วมงาน: ${deleting.nickname || deleting.realName}`, json: { updatedAt: deleting.updatedAt }, optimistic: { deleted: true } });
      setContacts((current) => current.filter((contact) => contact.id !== deleting.id)); setMessage(t.contacts.deleted);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.contacts.failed); }
    finally { setBusy(false); setDeleting(null); }
  }
  return <div className="workspace-layout"><header className="app-header"><div className="header-inner"><Brand /><AuthButton action="signOut" /></div></header><AppNav active="contacts" />
    <main className="calendar-main contacts-main"><div className="calendar-page-title"><div><p className="eyebrow muted">{t.contacts.description}</p><h1>{t.contacts.title}</h1></div><button type="button" className="button button-primary" onClick={() => setEditing("new")}>+ {t.contacts.add}</button></div>
      <div className="contacts-search"><InputField id="contacts-search" label={t.contacts.search} type="search" value={query} onValue={setQuery} autoComplete="off" /><button type="button" className="button button-secondary" disabled={busy} onClick={refresh}>{t.contacts.refresh}</button></div>
      <p className="search-result-count" role="status">{visible.length} รายชื่อ</p>
      {error && <div className="notice notice-error" role="alert">{error} <Link className="text-link" href="/settings">{t.jobs.settings}</Link></div>}
      {message && <div className="notice notice-feedback" role="status">{message}<button className="dismiss-notice" type="button" onClick={() => setMessage("")} aria-label="ปิดข้อความ">×</button></div>}
      {!visible.length && <p className="empty-state">{query ? t.contacts.noResults : t.contacts.empty}</p>}
      <div className="contacts-grid">{visible.map((contact) => <article className="contact-card" key={contact.id}><span className="contact-avatar" aria-hidden="true">{(contact.nickname || contact.realName).slice(0, 1)}</span><div className="contact-card-content"><h2>{contact.nickname || contact.realName}</h2>{contact.nickname && <p>{contact.realName}</p>}<a className="text-link contact-phone" href={`tel:${contact.phone.replace(/[^+0-9๐-๙]/g, "")}`}>{contact.phone}</a><dl className="contact-history"><div><dt>{t.contacts.count}</dt><dd>{contact.jobCount} งาน</dd></div><div><dt>{t.contacts.lastJob}</dt><dd>{contact.lastJobDate ? formatDay(contact.lastJobDate, { day: "numeric", month: "short", year: "numeric" }) : t.contacts.noJobs}</dd></div></dl><div className="contact-card-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setEditing(contact)}>{t.jobs.edit}</button><button type="button" className="button button-quiet delete-text" disabled={busy} onClick={() => setDeleting(contact)}>{t.contacts.delete}</button></div></div></article>)}</div>
    </main>
    {editing && <Modal title={editing === "new" ? t.contacts.add : t.contacts.edit} busy={editorBusy} onClose={() => setEditing(null)}><ContactEditor initial={editing === "new" ? undefined : editing} onSaved={saved} onCancel={() => setEditing(null)} onBusy={setEditorBusy} /></Modal>}
    {deleting && <ConfirmDialog title={t.contacts.deleteTitle} description={`${deleting.nickname || deleting.realName} · ${t.contacts.deleteDescription}`} confirmLabel={t.contacts.deleteConfirm} busy={busy} onClose={() => setDeleting(null)} onConfirm={() => void remove()} />}
  </div>;
}
