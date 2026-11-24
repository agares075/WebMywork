"use client";

import { useState } from "react";
import { InputField } from "@/components/ui/form-field";
import { contactInputSchema } from "@/lib/contacts/validation";
import { t } from "@/lib/i18n";
import type { Contact, ContactInput } from "@/types/contact";

export function ContactEditor({ initial, onSaved, onCancel, onBusy }: { initial?: Contact; onSaved: (contact: Contact) => void; onCancel: () => void; onBusy?: (busy: boolean) => void }) {
  const [id] = useState(() => initial?.id || crypto.randomUUID());
  const [input, setInput] = useState<ContactInput>({ phone: initial?.phone || "", realName: initial?.realName || "", nickname: initial?.nickname || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    const result = contactInputSchema.safeParse(input);
    if (!result.success) { setError(t.contacts.validation); return; }
    setBusy(true); onBusy?.(true); setError("");
    try {
      const response = await fetch(`/api/contacts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...result.data, ...(initial ? { updatedAt: initial.updatedAt } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.contacts.failed);
      onSaved(data.contact);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.contacts.failed); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <div className="contact-editor" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (!busy) void save(); } }}>
    <fieldset className="form-disabled-group" disabled={busy}><div className="contact-editor-fields">
      <InputField id={`contact-name-${id}`} label={t.contacts.realName} value={input.realName} maxLength={150} autoComplete="name" onValue={(value) => setInput({ ...input, realName: value })} />
      <InputField id={`contact-nickname-${id}`} label={t.contacts.nickname} value={input.nickname} maxLength={80} onValue={(value) => setInput({ ...input, nickname: value })} />
      <InputField id={`contact-phone-${id}`} label={t.contacts.phone} type="tel" inputMode="tel" value={input.phone} maxLength={32} autoComplete="tel" onValue={(value) => setInput({ ...input, phone: value })} />
    </div></fieldset>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    <div className="contact-editor-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>{t.jobs.cancel}</button><button type="button" className="button button-primary" disabled={busy} onClick={() => void save()}>{busy ? t.contacts.saving : t.contacts.save}</button></div>
  </div>;
}
