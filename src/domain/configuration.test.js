import test from 'node:test'
import assert from 'node:assert/strict'
import { isExistingConfigEdit, saveConfigValue } from './configuration.js'
for (const type of ['squad', 'status', 'taskType']) {
  test(`${type}: creation appends a value rather than renaming an empty entry`, () => {
    const editing = { type, value: '' }
    const isEditing = isExistingConfigEdit(editing, type, [])
    assert.equal(isEditing, false)
    assert.deepEqual(saveConfigValue([], 'Nova', isEditing ? editing.value : ''), ['Nova'])
    assert.deepEqual(saveConfigValue(['Existente'], 'Nova'), ['Existente', 'Nova'])
  })
}
test('existing edit replaces original value and creation does not duplicate it', () => {
  assert.equal(isExistingConfigEdit({ type: 'squad', value: 'Equipe' }, 'squad', ['Equipe']), true)
  assert.equal(isExistingConfigEdit({ type: 'squad', value: 'Ausente' }, 'squad', ['Equipe']), false)
  assert.deepEqual(saveConfigValue(['Equipe'], 'Nova', 'Equipe'), ['Nova'])
  assert.deepEqual(saveConfigValue(['Equipe'], 'Equipe'), ['Equipe'])
})
