export function ThemeScript() {
  const script = `try{var p=localStorage.getItem('daily-work-log:theme');document.documentElement.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}`;
  return <script id="daily-work-log-theme" dangerouslySetInnerHTML={{ __html: script }} />;
}
