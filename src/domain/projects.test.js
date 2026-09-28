import test from 'node:test'
import assert from 'node:assert/strict'
import { migrateLocalProjects, resolveTaskProject } from './projects.js'
test('project ID survives rename and takes precedence over legacy names', () => {
  const task = { projectId: 'p1', project: 'Old' }
  assert.equal(resolveTaskProject(task, [{id: 'p1', name: 'New'}]).name, 'New')
  assert.equal(resolveTaskProject({projectId: 'missing', project: 'New'}, [{id:'p1',name:'New'}]), undefined)
})
test('migration preserves IDs, avoids duplicate names, and removes duplicate configuration', () => {
  const data = new Map(Object.entries({
    'quality-vision-projects': JSON.stringify([{id:'p1',name:'Posnet'}]),
    'quality-vision-config': JSON.stringify({projects:[' posnet ','Other'],projectSquads:{Other:'Team'},statuses:['Pending']}),
    'quality-vision-ens': JSON.stringify([{id:'t1',project:'Posnet'}])
  }))
  const storage = { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v) }
  migrateLocalProjects(storage)
  migrateLocalProjects(storage)
  const projects = JSON.parse(data.get('quality-vision-projects'))
  assert.equal(projects.length,2)
  assert.equal(projects[0].id,'p1')
  assert.deepEqual(JSON.parse(data.get('quality-vision-ens')),[{id:'t1',projectId:'p1'}])
  assert.deepEqual(JSON.parse(data.get('quality-vision-config')),{statuses:['Pending']})
})
test('ambiguous names are not linked arbitrarily', () => {
  assert.equal(resolveTaskProject({project:'Demo'},[{id:'a',name:'Demo'},{id:'b',name:'demo'}]),undefined)
})
