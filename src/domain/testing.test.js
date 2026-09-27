import test from 'node:test'
import assert from 'node:assert/strict'
import { summarize, projectSummary, validBinding, validateScenario, normalizeStatus } from './testing.js'
const scenarios = (...statuses) => statuses.map((status) => ({ status }))
test('escopo vazio e todos excluídos não geram 100% nem NaN', () => {
  assert.equal(summarize([]).progress, null)
  assert.equal(summarize(scenarios('Excluído')).progress, null)
  assert.equal(summarize([]).situation, 'Sem cenários')
  assert.equal(summarize(scenarios('Excluído')).situation, 'Sem escopo executável')
})
test('falhas contam como executadas, exclusões saem do denominador', () => {
  const result = summarize(scenarios('Aprovado', 'Falhado', 'Pendente', 'Excluído'))
  assert.equal(result.total, 4); assert.equal(result.valid, 3)
  assert.equal(result.progress, 2 / 3 * 100); assert.equal(result.approval, 1 / 3 * 100)
  assert.equal(result.approved + result.failed + result.pending + result.excluded, result.total)
})
test('execução concluída com falhas não representa aprovação', () => {
  assert.equal(summarize(scenarios('Falhado')).situation, 'Execução concluída com falhas')
  assert.equal(summarize(scenarios('Aprovado')).situation, 'Aprovado')
  assert.equal(summarize(scenarios('Pendente')).progress, 0)
})
test('projeto usa peso por cenário, preserva fluxos vazios e isola outros projetos', () => {
  const flows = [{ id: 'a', projectId: 'p' }, { id: 'b', projectId: 'p' }, { id: 'c', projectId: 'p' }, { id: 'x', projectId: 'other' }]
  const rows = [{ projectId: 'p', flowId: 'a', status: 'Aprovado' }, ...Array.from({ length: 9 }, () => ({ projectId: 'p', flowId: 'b', status: 'Pendente' })), { projectId: 'other', flowId: 'x', status: 'Aprovado' }, { projectId: 'p', flowId: 'x', status: 'Aprovado' }]
  const result = projectSummary('p', flows, rows)
  assert.equal(result.progress, 10); assert.equal(result.total, 10); assert.equal(result.flows.length, 3)
  assert.equal(result.flows[2].summary.progress, null)
})
test('vínculos entre projetos incompatíveis são rejeitados', () => {
  const projects = [{ id: 'p' }, { id: 'q' }], flows = [{ id: 'f', projectId: 'p' }]
  assert.equal(validBinding({ projectId: 'q', flowId: 'f' }, projects, flows), false)
  assert.throws(() => validateScenario({ title: 'Teste', status: 'Pendente', projectId: 'q', flowId: 'f' }, projects, flows), /pertencente/)
  const base = { title: 'Teste', projectId: 'p', flowId: 'f' }
  assert.throws(() => validateScenario({ ...base, status: 'Excluído' }, projects, flows), /justificativa/)
  assert.throws(() => validateScenario({ ...base, status: 'Aprovado' }, projects, flows), /data/)
  assert.doesNotThrow(() => validateScenario({ ...base, status: 'Pendente' }, projects, flows))
})
test('legados sem status são pendentes e aliases são normalizados', () => {
  assert.equal(normalizeStatus('SUCCESS'), 'Aprovado')
  assert.equal(normalizeStatus('PASSED'), 'Aprovado')
  assert.equal(summarize([{}]).pending, 1)
  assert.equal(validBinding({ title: 'Legado' }, [], []), false)
})
