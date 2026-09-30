import { useEffect, useState } from 'react'
export const paths = { Home: '/', 'Visão do Projeto': '/projetos', 'Cenários': '/cenarios', Impactos: '/impedimentos', Bugs: '/bugs', Configuração: '/configuracoes' }
function read() {
  if (window.location.pathname === '/impactos') return {tab:'Impactos', params:Object.fromEntries(new URLSearchParams(window.location.search))}
  const tab = window.location.pathname === '/tarefas'
    ? 'Configuração'
    : Object.keys(paths).find((key) => paths[key] === window.location.pathname) || 'Home'
  const params = Object.fromEntries(new URLSearchParams(window.location.search))
  if (window.location.pathname === '/tarefas') params.view = 'registrations'
  return { tab, params }
}
export default function useNavigation() {
  const [route, setRoute] = useState(read)
  useEffect(() => { const update = () => setRoute(read()); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update) }, [])
  const navigate = (tab, params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
    window.history.pushState({}, '', `${paths[tab] || '/'}${query ? `?${query}` : ''}`)
    setRoute(read())
  }
  return { ...route, navigate }
}
