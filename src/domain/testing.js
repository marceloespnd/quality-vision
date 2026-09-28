export const scenarioStatuses = ['Pendente', 'Aprovado', 'Falhado', 'Excluído', 'Bloqueado']
export function normalizeStatus(value) {
  const aliases = { SUCCESS: 'Aprovado', PASSED: 'Aprovado', FAILED: 'Falhado', FAIL: 'Falhado', EXCLUDE: 'Excluído', PENDENTE: 'Pendente', PENDENTS: 'Pendente' }
  return scenarioStatuses.includes(value) ? value : aliases[value] || 'Pendente'
}
export function summarize(scenarios) {
  const counts = { total: scenarios.length, approved: 0, failed: 0, excluded: 0, pending: 0, blocked: 0 }
  const keys = { Aprovado: 'approved', Falhado: 'failed', Excluído: 'excluded', Pendente: 'pending', Bloqueado: 'blocked' }
  scenarios.forEach((item) => counts[keys[normalizeStatus(item.status)]]++)
  const valid = counts.total - counts.excluded
  const executed = counts.approved + counts.failed
  return { ...counts, valid, executed, progress: valid ? executed / valid * 100 : null, approval: valid ? counts.approved / valid * 100 : null,
    situation: !counts.total ? 'Sem cenários' : !valid ? 'Sem escopo executável' : counts.blocked ? 'Bloqueado' : counts.pending ? executed ? 'Em andamento' : 'Não iniciado' : counts.failed ? 'Execução concluída com falhas' : 'Aprovado' }
}
export function validBinding(scenario, projects, flows) {
  return projects.some((p) => p.id === scenario.projectId) && flows.some((f) => f.id === scenario.flowId && f.projectId === scenario.projectId)
}
export function projectSummary(projectId, flows, scenarios) {
  const projectFlows = flows.filter((flow) => flow.projectId === projectId)
  const records = scenarios.filter((s) => s.projectId === projectId && projectFlows.some((f) => f.id === s.flowId))
  return { ...summarize(records), flows: projectFlows.map((flow) => ({ ...flow, summary: summarize(records.filter((s) => s.flowId === flow.id)) })) }
}
export function validateScenario(data, projects, flows) {
  if (!data.title?.trim() || data.title.length > 200) throw new Error('Informe o nome do cenário (até 200 caracteres).')
  if (!validBinding(data, projects, flows)) throw new Error('Selecione um projeto e um fluxo pertencente a ele.')
  if (!scenarioStatuses.includes(data.status)) throw new Error('Status inválido.')
  if (data.status === 'Excluído' && !data.exclusionReason?.trim()) throw new Error('Informe a justificativa da exclusão.')
  if (['Aprovado', 'Falhado'].includes(data.status) && (!/^\d{4}-\d{2}-\d{2}$/.test(data.executedAt || '') || !Number.isFinite(Date.parse(data.executedAt)) || new Date(data.executedAt).toISOString().slice(0, 10) !== data.executedAt)) throw new Error('Informe uma data válida da execução.')
  for (const [key, max] of Object.entries({ description: 2000, scriptFile: 300, notes: 2000, exclusionReason: 1000 })) {
    if (typeof data[key] !== 'undefined' && (typeof data[key] !== 'string' || data[key].length > max)) throw new Error(`Campo ${key} inválido ou muito longo.`)
  }
}
