const paths = {
  sidebar: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 0v18M5.5 7v10',
  bug: 'M9 7V5a3 3 0 0 1 6 0v2M7 8h10v7a5 5 0 0 1-10 0V8zm-4 3h4m10 0h4M3 17h4m10 0h4M5 4l3 4m11-4-3 4M12 8v12',
  home: 'm3 10 9-7 9 7v10H5V10m4 10v-7h6v7',
  chart: 'M4 3v17h17M8 16v-5m5 5V7m5 9V4',
  scenarios: 'M8 5H5v15h14V5h-3M9 3h6v4H9zM8 12l2 2 5-5M8 17h8',
  alert: 'm12 3 10 18H2L12 3zm0 6v5m0 3v1',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  check: 'm5 12 4 4L19 6',
  cross: 'm6 6 12 12M6 18 18 6',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  minus: 'M5 12h14',
}
export const navigationIcons = { Home: 'home', 'Visão do Projeto': 'chart', Cenários: 'scenarios', Impactos: 'alert', Bugs: 'bug', Configuração: 'settings' }
export default function Icon({ name, label }) {
  return <svg className="ds-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}><path d={paths[name] || paths.scenarios} /></svg>
}
