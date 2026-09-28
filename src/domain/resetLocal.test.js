import test from 'node:test'
import assert from 'node:assert/strict'
import { resetLocal, restoreLocal, backupKey, clearedKey } from './resetLocal.js'
const storage = (entries = {}) => {
  const data = new Map(Object.entries(entries))
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}
test('reset clears related records, preserves preferences and restores original data', () => {
  const s = storage({ 'quality-vision-projects': '[{"id":"p1"}]', 'quality-vision-theme': 'dark' })
  resetLocal(s, { ens: [{ id: 't1' }], bugs: [], logs: [], config: { statuses: ['Pendente'], projects: ['Demo'] } })
  for (const name of ['projects', 'flows', 'scenarios', 'impacts', 'ens', 'bugs', 'logs']) assert.equal(s.getItem(`quality-vision-${name}`), '[]')
  assert.equal(s.getItem(clearedKey), 'true')
  assert.equal(s.getItem('quality-vision-theme'), 'dark')
  assert.deepEqual(JSON.parse(s.getItem('quality-vision-config')).projects, [])
  restoreLocal(s)
  assert.equal(s.getItem('quality-vision-projects'), '[{"id":"p1"}]')
  assert.equal(s.getItem('quality-vision-ens'), '[{"id":"t1"}]')
  assert.equal(s.getItem(clearedKey), null)
  assert.equal(s.getItem(backupKey), null)
})
test('backup failure does not clear active records', () => {
  const s = storage({ 'quality-vision-projects': '[{"id":"p1"}]' })
  s.setItem = () => { throw new Error('Storage full') }
  assert.throws(() => resetLocal(s, { ens: [], bugs: [], logs: [], config: {} }))
  assert.equal(s.getItem('quality-vision-projects'), '[{"id":"p1"}]')
})
