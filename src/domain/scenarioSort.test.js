import test from 'node:test'
import assert from 'node:assert/strict'
import { sortScenarios } from './scenarioSort.js'
const options = { flows: [{id:'a',name:'Ábertura'},{id:'b',name:'Crédito'}], locale:'pt-BR', statusLabel: s => s }
const records = [
  {id:'1', flowId:'b', scriptFile:'script10.xml', executedAt:'2026-02-01', status:'Pendente'},
  {id:'2', flowId:'a', title:'script2.xml', executedAt:'2025-12-30', status:'Aprovado'},
  {id:'3', flowId:'a', title:'script2.xml', executedAt:'', status:'Falhado'},
]
const ids = (key,direction) => sortScenarios(records,{key,direction},options).map(s=>s.id)
test('sorts flow names and script names naturally, preserving ties and input', () => {
  assert.deepEqual(ids('flow','asc'),['2','3','1'])
  assert.deepEqual(ids('flow','desc'),['1','2','3'])
  assert.deepEqual(ids('script','asc'),['2','3','1'])
  assert.deepEqual(ids('script','desc'),['1','2','3'])
  assert.deepEqual(records.map(s=>s.id),['1','2','3'])
})
test('dates sort chronologically and missing dates stay last', () => {
  assert.deepEqual(ids('date','asc'),['2','1','3'])
  assert.deepEqual(ids('date','desc'),['1','2','3'])
})
test('statuses sort by displayed label in either direction', () => {
  assert.deepEqual(ids('status','asc'),['2','3','1'])
  assert.deepEqual(ids('status','desc'),['1','3','2'])
  assert.deepEqual(sortScenarios([], {key:'status',direction:'asc'},options),[])
})
