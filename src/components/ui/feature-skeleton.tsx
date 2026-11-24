export function FeatureSkeleton({ form = false }: { form?: boolean }) {
  return <main className={`feature-skeleton ${form ? "form-skeleton" : ""}`} role="status" aria-label="กำลังโหลดข้อมูล"><div className="skeleton-title" /><div className="skeleton-tools" /><div className="skeleton-grid">{Array.from({ length: form ? 6 : 4 }, (_, index) => <div className="skeleton-card" key={index}><div /><div /><div /></div>)}</div><span className="sr-only">กำลังโหลดข้อมูล กรุณารอสักครู่</span></main>;
}
