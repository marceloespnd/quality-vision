import test from 'node:test'
import assert from 'node:assert/strict'
import { affectsScenario, executionScenarios, validateOccurrence } from './occurrences.js'
import { summarize } from './testing.js'
const scenario = {id:'s1',projectId:'p',flowId:'f',status:'Pendente'}
const bug = {id:'b',projectId:'p',flowId:'f',scenarioIds:['s1'],blocksExecution:true,status:'Novo'}
const impediment = {id:'i',projectId:'p',blocksExecution:true,status:'Aberto'}
test('multiple active causes block until the last cause resolves; never auto-approve', () => {
  assert.equal(executionScenarios([scenario],[bug],[impediment])[0].status,'Bloqueado')
  assert.equal(executionScenarios([scenario],[{...bug,status:'Fechado'}],[impediment])[0].status,'Bloqueado')
  assert.equal(executionScenarios([scenario],[{...bug,status:'Fechado'}],[{...impediment,status:'Resolvido'}])[0].status,'Pendente')
  assert.equal(executionScenarios([scenario],[{...bug,blocksExecution:false}],[])[0].status,'Pendente')
})
test('project, flow, multiple scenario and legacy scope isolate unrelated scenarios', () => {
  assert.equal(affectsScenario(impediment,scenario),true)
  assert.equal(affectsScenario({...impediment,flowId:'other'},scenario),false)
  assert.equal(affectsScenario({...impediment,scenarioIds:['s1','s2']},scenario),true)
  assert.equal(affectsScenario({scenarioId:'s1'},scenario),true)
  assert.equal(affectsScenario({...impediment,projectId:'other'},scenario),false)
})
test('blocked scenarios remain in executable scope without counting as executed', () => {
  const rows=executionScenarios([scenario,{...scenario,id:'s2',status:'Aprovado'},{...scenario,id:'s3',status:'Excluído'}],[],[impediment])
  const totals=summarize(rows)
  assert.equal(totals.blocked,1); assert.equal(totals.approved,1); assert.equal(totals.excluded,1)
  assert.equal(totals.progress,50); assert.equal(totals.situation,'Bloqueado')
})
test('rejects occurrence links to a different project or flow', () => {
  const projects=[{id:'p'}],flows=[{id:'f',projectId:'p'}]
  const data={...bug,desc:'Issue',owner:'QA'}
  assert.doesNotThrow(()=>validateOccurrence(data,projects,flows,[scenario]))
  assert.throws(()=>validateOccurrence({...data,scenarioIds:['missing']},projects,flows,[scenario]))
  assert.throws(()=>validateOccurrence({...data,flowId:'missing'},projects,flows,[scenario]))
})
