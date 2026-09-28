import { normalizeStatus } from './testing.js'

export function sortScenarios(records, { key, direction }, { flows, locale, statusLabel }) {
  if (!key) return records
  const names = new Map(flows.map(flow => [flow.id, flow.name]))
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  const value = scenario => {
    switch (key) {
      case 'flow': return names.get(scenario.flowId) || ''
      case 'script': return scenario.scriptFile || scenario.title || ''
      case 'date': return scenario.executedAt || ''
      case 'status': return statusLabel(normalizeStatus(scenario.status))
      default: return ''
    }
  }
  return [...records].sort((a, b) => {
    const left = value(a), right = value(b)
    // Missing values stay last in either direction; equal values keep source order.
    if (!left || !right) return left ? -1 : right ? 1 : 0
    return collator.compare(left, right) * (direction === 'desc' ? -1 : 1)
  })
}
