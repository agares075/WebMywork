import type { JobInput } from "@/types/job";
import { FormSection, InputField, TextAreaField } from "@/components/ui/form-field";
import { bangkokNow, hoursBetween } from "@/lib/calculations";
import { t } from "@/lib/i18n";

export type JobFieldsProps = { value: JobInput; update: <K extends keyof JobInput>(key: K, value: JobInput[K]) => void; prefix?: string };
export function TimeFields({ value, update, prefix = "" }: JobFieldsProps) {
  return <><div className="field-grid"><InputField id={prefix + "start-time"} label={t.jobs.start} type="time" required value={value.startTime} onValue={(v) => update("startTime", v)} /><InputField id={prefix + "end-time"} label={t.jobs.end} type="time" required value={value.endTime} onValue={(v) => update("endTime", v)} /></div><p className="field-help">{t.jobs.overnight}</p></>;
}
export function AttendanceFields({ value, update, prefix = "" }: JobFieldsProps) {
  return <>{(["checkIn", "checkOut"] as const).map((field) => <div className="time-with-now" key={field}><InputField id={prefix + field} label={t.jobs[field]} type="datetime-local" value={value[field]} onValue={(v) => update(field, v)} /><button className="button button-secondary" type="button" onClick={() => update(field, bangkokNow())}>{t.jobs.now}</button></div>)}<p className="calculated-value">{t.jobs.hours}<strong>{hoursBetween(value.checkIn, value.checkOut)} ชม.</strong></p></>;
}
export function WorkFields({ value, update, clients, hideDate = false, hideAttendance = false, disableDate = false }: JobFieldsProps & { clients: string[]; hideDate?: boolean; hideAttendance?: boolean; disableDate?: boolean }) {
  return <>
    <FormSection title={t.jobs.sectionWork}>
      <InputField id="client" label={t.jobs.client} value={value.client} onValue={(v) => update("client", v)} required maxLength={200} list="previous-clients" autoComplete="organization" />
      <datalist id="previous-clients">{clients.map((client) => <option key={client} value={client} />)}</datalist>
      {!hideDate && <InputField id="work-date" label={t.jobs.workDate} type="date" value={value.workDate} required disabled={disableDate} onValue={(v) => update("workDate", v)} />}
      <TimeFields value={value} update={update} />
      <TextAreaField id="details" label={t.jobs.details} value={value.details} onValue={(v) => update("details", v)} />
    </FormSection>
    <FormSection title={t.jobs.sectionTime}>
      <InputField id="location" label={t.jobs.location} value={value.location} maxLength={500} onValue={(v) => update("location", v)} />
      {value.location && <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.location)}`} target="_blank" rel="noopener noreferrer">{t.jobs.maps}</a>}
      {!hideAttendance && <AttendanceFields value={value} update={update} />}
    </FormSection>
  </>;
}
