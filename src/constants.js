export const APP_VERSION = 'v1.43.1'
export const COPYRIGHT = '© veltrix, 2026'

export const tabs = ['Home', 'Cadastro de Tarefas', 'Configurações']
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
  Finalizado: '#10B981',
  'Em andamento': '#2563EB',
  Bloqueado: '#F97316',
  Impactado: '#F97316',
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
