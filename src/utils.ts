export { cx } from "../platform/shared/format.ts"

export function normalizeDate(value?: string | { toDate: () => Date }): string {
  return (typeof value === 'object' ? value.toDate().toLocaleString('pt-BR') : value) || new Date().toLocaleString('pt-BR')
}

export function uniq(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}
