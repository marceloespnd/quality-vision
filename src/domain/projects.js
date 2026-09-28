export const projectNameKey = name => (name || '').trim().normalize('NFC').toLocaleLowerCase('pt-BR')
export function resolveTaskProject(task, projects) {
  if (task.projectId) return projects.find(project => project.id === task.projectId)
  const matches = projects.filter(project => projectNameKey(project.name) === projectNameKey(task.project))
  return matches.length === 1 ? matches[0] : undefined
}
export function migrateLocalProjects(storage) {
  const read = (name, fallback) => JSON.parse(storage.getItem(`quality-vision-${name}`) || JSON.stringify(fallback))
  const config = read('config', {})
  const projects = read('projects', [])
  if (storage.getItem('quality-vision-cleared')) return
  if (!Array.isArray(projects) || !config || typeof config !== 'object' || (config.projects && !Array.isArray(config.projects))) throw new Error('Invalid project data')
  for (const name of config.projects || []) {
    if (!projects.some(project => projectNameKey(project.name) === projectNameKey(name))) {
      projects.push({ id: crypto.randomUUID(), name, owner: 'Marcelo', squad: config.projectSquads?.[name] || '' })
    }
  }
  const tasks = read('ens', [])
  if (!Array.isArray(tasks)) throw new Error('Invalid task data')
  const migrated = tasks.map(task => {
    const project = resolveTaskProject(task, projects)
    if (!project) return task
    const { project: oldName, ...rest } = task
    return { ...rest, projectId: project.id }
  })
  const original = Object.fromEntries(['projects', 'ens', 'config'].map(name => [name, storage.getItem(`quality-vision-${name}`)]))
  if (!storage.getItem('quality-vision-project-migration-backup')) storage.setItem('quality-vision-project-migration-backup', JSON.stringify(original))
  storage.setItem('quality-vision-projects', JSON.stringify(projects))
  storage.setItem('quality-vision-ens', JSON.stringify(migrated))
  const { projects: legacy, projectSquads, ...settings } = config
  storage.setItem('quality-vision-config', JSON.stringify(settings))
}
