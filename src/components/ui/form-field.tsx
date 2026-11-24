import type { InputHTMLAttributes, ReactNode } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onValue: (value: string) => void };
export function InputField({ label, id, onValue, className = "", ...props }: Props) {
  return <div className={`form-field ${className}`}><label htmlFor={id}>{label}</label><input id={id} {...props} onChange={(event) => onValue(event.target.value)} /></div>;
}
export function TextAreaField({ id, label, value, onValue }: { id: string; label: string; value: string; onValue: (value: string) => void }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label><textarea id={id} value={value} maxLength={10000} rows={3} onChange={(event) => onValue(event.target.value)} /></div>;
}
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="form-section"><legend>{title}</legend><div className="section-fields">{children}</div></fieldset>;
}
