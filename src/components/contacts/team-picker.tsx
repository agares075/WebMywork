"use client";

import { useMemo, useState } from "react";
import { FormSection, InputField } from "@/components/ui/form-field";
import { ContactEditor } from "./contact-editor";
import { contactMatches } from "@/lib/contacts/search";
import { t } from "@/lib/i18n";
import type { Contact, ContactHistory } from "@/types/contact";

export function TeamPicker({ initialContacts, selected, onSelection, onEditingChange }: { initialContacts: ContactHistory[]; selected: string[]; onSelection: (ids: string[]) => void; onEditingChange: (open: boolean) => void }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(() => contacts.filter((contact) => contactMatches(contact, query)), [contacts, query]);
  const previous = contacts.filter((contact) => contact.jobCount > 0 && !selected.includes(contact.id)).slice(0, 8);
  const toggle = (id: string) => onSelection(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  function saved(contact: Contact) {
    setContacts((current) => [{ ...contact, jobCount: 0, lastJobDate: "" }, ...current]);
    onSelection([...new Set([...selected, contact.id])]); setAdding(false); onEditingChange(false); setMessage(t.contacts.attached); setQuery("");
  }
  async function refresh() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/contacts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.contacts.failed);
      setContacts(data.contacts);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.contacts.failed); }
    finally { setLoading(false); }
  }
  return <FormSection title={t.contacts.team}>
    {selected.length > 0 && <div className="team-selected" aria-label={t.contacts.selected}>{selected.map((id) => {
      const contact = contacts.find((value) => value.id === id);
      return <button type="button" className={`team-chip ${!contact ? "missing-contact" : ""}`} disabled={adding} key={id} onClick={() => toggle(id)} aria-label={`นำ ${contact?.nickname || contact?.realName || t.contacts.missing} ออกจากทีม`}>{contact?.nickname || contact?.realName || t.contacts.missing}<span aria-hidden="true">×</span></button>;
    })}</div>}
    {previous.length > 0 && <div><p className="picker-label">{t.contacts.previous}</p><div className="team-quick">{previous.map((contact) => <button type="button" className="button button-secondary" disabled={adding || selected.length >= 100} key={contact.id} onClick={() => toggle(contact.id)}>+ {contact.nickname || contact.realName}</button>)}</div></div>}
    <InputField id="team-search" label={t.contacts.search} type="search" value={query} onValue={setQuery} autoComplete="off" />
    <div className="team-options" role="group" aria-label={t.contacts.all}>{visible.map((contact) => <label className="team-option" key={contact.id}><input type="checkbox" checked={selected.includes(contact.id)} disabled={adding || (!selected.includes(contact.id) && selected.length >= 100)} onChange={() => toggle(contact.id)} /><span><strong>{contact.nickname || contact.realName}</strong><span>{contact.nickname ? `${contact.realName} · ` : ""}{contact.phone}</span><small>{contact.jobCount ? `${contact.jobCount} งานที่ทำด้วยกัน` : t.contacts.noJobs}</small></span></label>)}{!visible.length && <p className="picker-empty">{t.contacts.noResults}</p>}</div>
    {message && <p className="field-help" role="status">{message}</p>}{error && <p className="error-text" role="alert">{error}</p>}
    <div className="picker-actions"><button type="button" className="button button-secondary" disabled={adding || selected.length >= 100} onClick={() => { setAdding(true); onEditingChange(true); }}>+ {t.contacts.inlineAdd}</button><button type="button" className="button button-quiet" disabled={loading || adding} onClick={refresh}>{t.contacts.refresh}</button></div>
    {adding && <div className="inline-contact"><h3>{t.contacts.inlineAdd}</h3><ContactEditor onSaved={saved} onCancel={() => { setAdding(false); onEditingChange(false); }} /></div>}
  </FormSection>;
}
