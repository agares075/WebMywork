"use client";

import { useState } from "react";
import { useAppRuntime, useErrorToast } from "@/components/ui/app-runtime";
import { useLocalDraft } from "@/components/ui/use-local-draft";
import { InputField } from "@/components/ui/form-field";
import { contactInputSchema } from "@/lib/contacts/validation";
import { t } from "@/lib/i18n";
import type { Contact, ContactInput } from "@/types/contact";

export function ContactEditor({ initial, onSaved, onCancel, onBusy }: { initial?: Contact; onSaved: (contact: Contact) => void; onCancel: () => void; onBusy?: (busy: boolean) => void }) {
  const [id] = useState(() => initial?.id || crypto.randomUUID());
  const { account, mutate } = useAppRuntime();
  const { value: input, setValue: setInput, ready, clear } = useLocalDraft<ContactInput>(account ? `daily-work-log:${account}:contact-draft:${initial?.id || "new"}` : null, { phone: initial?.phone || "", realName: initial?.realName || "", nickname: initial?.nickname || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useErrorToast(error);
  async function save() {
    const result = contactInputSchema.safeParse(input);
    if (!result.success) { setError(t.contacts.validation); return; }
    setBusy(true); onBusy?.(true); setError("");
    try {
      const now = new Date().toISOString();
      const contact = { ...result.data, id, createdAt: initial?.createdAt || now, updatedAt: now };
      const data = await mutate({ url: `/api/contacts/${id}`, method: "PUT", entity: `contact:${id}`, label: `ผู้ร่วมงาน: ${contact.nickname || contact.realName}`, json: { ...result.data, ...(initial ? { updatedAt: initial.updatedAt } : {}) }, optimistic: { contact }, ...(initial ? { base: { ...initial } } : {}), localVersion: now });
      clear(); onSaved(data.contact!);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t.contacts.failed); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <div className="contact-editor" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (!busy && ready) void save(); } }}>
    <fieldset className="form-disabled-group" disabled={busy || !ready}><div className="contact-editor-fields">
      <InputField id={`contact-name-${id}`} label={t.contacts.realName} value={input.realName} maxLength={150} autoComplete="name" onValue={(value) => setInput({ ...input, realName: value })} />
      <InputField id={`contact-nickname-${id}`} label={t.contacts.nickname} value={input.nickname} maxLength={80} onValue={(value) => setInput({ ...input, nickname: value })} />
      <InputField id={`contact-phone-${id}`} label={t.contacts.phone} type="tel" inputMode="tel" value={input.phone} maxLength={32} autoComplete="tel" onValue={(value) => setInput({ ...input, phone: value })} />
    </div></fieldset>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    <div className="contact-editor-actions"><button type="button" className="button button-secondary" disabled={busy || !ready} onClick={onCancel}>{t.jobs.cancel}</button><button type="button" className="button button-primary" disabled={busy || !ready} onClick={() => void save()}>{busy ? t.contacts.saving : t.contacts.save}</button></div>
  </div>;
}
