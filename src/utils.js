export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function normalizeDate(value) {
  return value?.toDate?.().toLocaleString?.('pt-BR') || value || new Date().toLocaleString('pt-BR')
}

export function uniq(items) {
  return [...new Set(items.filter(Boolean))]
}
