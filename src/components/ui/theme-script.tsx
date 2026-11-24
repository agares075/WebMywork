export function ThemeScript() {
  const script = `try{var p=localStorage.getItem('daily-work-log:theme');document.documentElement.dataset.theme=p==='dark'||p==='light'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}`;
  return <script id="daily-work-log-theme" dangerouslySetInnerHTML={{ __html: script }} />;
}
