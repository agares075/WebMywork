import { FormSection, TextAreaField } from "@/components/ui/form-field";
import { outfits, shoes } from "@/lib/jobs/validation";
import { t } from "@/lib/i18n";
import type { JobInput } from "@/types/job";
import type { JobFieldsProps } from "./work-fields";

export function ExtraFields({ value, update }: JobFieldsProps) {
  return <FormSection title={t.jobs.sectionExtra}>
    <div className="form-field"><label htmlFor="outfit">{t.jobs.outfit}</label><select id="outfit" value={value.outfit} onChange={(event) => update("outfit", event.target.value as JobInput["outfit"])}>{outfits.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="form-field shoes-field"><label htmlFor="shoes">{t.jobs.shoes}</label><select id="shoes" value={value.shoes} onChange={(event) => update("shoes", event.target.value as JobInput["shoes"])}>{shoes.map((item) => <option key={item}>{item}</option>)}</select></div>
    <TextAreaField id="comment" label={t.jobs.comment} value={value.comment} onValue={(v) => update("comment", v)} />
  </FormSection>;
}
