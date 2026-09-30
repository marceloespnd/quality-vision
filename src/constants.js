export const APP_VERSION = 'v1.48.0'
export const COPYRIGHT = '© veltrix, 2026'

export const tabs = ['Home', 'Visão do Projeto', 'Cenários', 'Impactos', 'Bugs', 'Configuração']
export const featureLabels = {
  'pt-BR': {
    Home: 'Início',
    'Visão do Projeto': 'Visão do Projeto',
    Cenários: 'Cenários',
    Impactos: 'Impedimentos',
    Bugs: 'Bugs',
    Configuração: 'Configuração',
  },
  'en-US': {
    Home: 'Home',
    'Visão do Projeto': 'Project Overview',
    Cenários: 'Scenarios',
    Impactos: 'Impediments',
    Bugs: 'Bugs',
    Configuração: 'Settings',
  },
}
export const statusLabels = {
  Finalizado: 'Completed',
  'Em andamento': 'In progress',
  Bloqueado: 'Blocked',
  Impactado: 'Impacted',
  Pendente: 'Pending',
  Novo: 'New',
  'Em análise': 'Under review',
  Corrigido: 'Fixed',
  Crítico: 'Critical',
  Aprovado: 'Passed',
  Falhado: 'Failed',
  Excluído: 'Excluded',
  Aberto: 'Open',
  'Em tratamento': 'In progress',
  Resolvido: 'Resolved',
  Baixa: 'Low',
  Média: 'Medium',
  Alta: 'High',
  Crítica: 'Critical',
}
export const baseStatuses = ['Finalizado', 'Em andamento', 'Bloqueado', 'Impactado', 'Pendente']
export const bugStatuses = ['Novo', 'Em análise', 'Corrigido', 'Crítico']
export const taskTypes = ['Testes', 'Scripts', 'Automação']

export const statusStyle = {
  Finalizado: 'bg-[var(--green-soft)] text-[var(--green)] ring-[var(--green)]',
  'Em andamento': 'bg-[var(--blue-soft)] text-[var(--blue)] ring-[var(--blue)]',
  Bloqueado: 'bg-[var(--orange-soft)] text-[var(--orange)] ring-[var(--orange)]',
  Impactado: 'bg-[var(--orange-soft)] text-[var(--orange)] ring-[var(--orange)]',
  Pendente: 'bg-[var(--gray-soft)] text-[var(--gray)] ring-[var(--gray)]',
  Novo: 'bg-[var(--gray-soft)] text-[var(--gray)] ring-[var(--gray)]',
  'Em análise': 'bg-[var(--orange-soft)] text-[var(--orange)] ring-[var(--orange)]',
  Corrigido: 'bg-[var(--green-soft)] text-[var(--green)] ring-[var(--green)]',
  Crítico: 'bg-[var(--red-soft)] text-[var(--red)] ring-[var(--red)]',
}

export const statusColor = {
  Finalizado: '#2E844A',
  'Em andamento': '#0176D3',
  Bloqueado: '#8C4B02',
  Impactado: '#8C4B02',
  Pendente: '#6B7280',
}

export const statusIconStyle = {
  Finalizado: 'bg-[var(--green)] shadow-black/20',
  'Em andamento': 'bg-[var(--blue)] shadow-black/20',
  Bloqueado: 'bg-[var(--orange)] shadow-black/20',
  Impactado: 'bg-[var(--orange)] shadow-black/20',
  Pendente: 'bg-[var(--gray)] shadow-black/20',
  'Total EN': 'bg-[var(--purple)] shadow-black/20',
  'Total Bugs': 'bg-[var(--red)] shadow-black/20',
}
