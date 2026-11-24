import { Brand } from "./brand";

export function LoadingScreen() {
  return <main className="loading-screen" aria-label="กำลังโหลด" role="status"><Brand /><div className="loading-skeleton"><div /><div /><div /></div><span className="sr-only">กำลังโหลดพื้นที่ทำงาน</span></main>;
}
