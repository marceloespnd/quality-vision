export const bugStatuses = ['Novo', 'Em análise', 'Em correção', 'Pronto para reteste', 'Fechado']
export const impedimentStatuses = ['Aberto', 'Em tratamento', 'Resolvido']
export function occurrenceActive(item, kind) {
  return kind === 'bugs' ? !['Fechado', 'Corrigido'].includes(item.status) : item.status !== 'Resolvido'
}
export function affectsScenario(item, scenario) {
  const ids = item.scenarioIds?.length ? item.scenarioIds : item.scenarioId ? [item.scenarioId] : []
  if (ids.length) return ids.includes(scenario.id)
  if (item.flowId) return item.flowId === scenario.flowId && item.projectId === scenario.projectId
  return Boolean(item.projectId && item.projectId === scenario.projectId)
}
export function blockersFor(scenario, bugs, impediments) {
  return [ ...bugs.filter(item => item.blocksExecution && occurrenceActive(item, 'bugs') && affectsScenario(item, scenario)).map(item => ({...item, kind:'bugs'})),
    ...impediments.filter(item => item.blocksExecution && occurrenceActive(item, 'impacts') && affectsScenario(item, scenario)).map(item => ({...item, kind:'impacts'})) ]
}
export function executionScenarios(scenarios, bugs, impediments) {
  return scenarios.map(scenario => {
    const blockers = blockersFor(scenario, bugs, impediments)
    const pending = !scenario.status || ['Pendente','Bloqueado'].includes(scenario.status)
    return { ...scenario, blockers, status: pending ? blockers.length ? 'Bloqueado' : 'Pendente' : scenario.status }
  })
}
export function validateOccurrence(data, projects, flows, scenarios) {
  if (!data.desc?.trim() || !data.owner?.trim()) throw new Error('Enter description and owner.')
  if (!projects.some(p => p.id === data.projectId)) throw new Error('Select a valid project.')
  if (data.flowId && !flows.some(f => f.id === data.flowId && f.projectId === data.projectId)) throw new Error('Select a valid flow.')
  if (data.scenarioIds.length > 8) throw new Error('Select up to 8 scenarios or choose the entire flow.')
  if (data.scenarioIds.some(id => !scenarios.some(s => s.id === id && s.projectId === data.projectId && (!data.flowId || s.flowId === data.flowId)))) throw new Error('Select scenarios belonging to the project and flow.')
}
