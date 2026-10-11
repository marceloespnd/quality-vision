export const backupKey = 'quality-vision-reset-backup'
export const clearedKey = 'quality-vision-cleared'
const collections = ['projects', 'flows', 'scenarios', 'impacts', 'ens', 'bugs', 'logs']
export function resetLocal(storage, current) {
  const keys = [...collections.map(name => `quality-vision-${name}`), 'quality-vision-config', clearedKey]
  const backup = Object.fromEntries(keys.map(key => [key, storage.getItem(key)]))
  for (const name of ['ens', 'bugs', 'logs']) backup[`quality-vision-${name}`] = JSON.stringify(current[name])
  storage.setItem(backupKey, JSON.stringify(backup))
  // Save the recovery copy before changing any active data.
  for (const name of collections) storage.setItem(`quality-vision-${name}`, '[]')
  storage.setItem('quality-vision-config', JSON.stringify({ ...current.config, projects: [], squads: [], projectSquads: {} }))
  storage.setItem(clearedKey, 'true')
}
export function restoreLocal(storage) {
  const backup = JSON.parse(storage.getItem(backupKey))
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) throw new Error('Invalid backup')
  for (const [key, value] of Object.entries(backup)) {
    if (!key.startsWith('quality-vision-')) throw new Error('Invalid backup key')
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
  storage.removeItem(backupKey)
}
