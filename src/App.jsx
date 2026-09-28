import BrandLogo from './components/BrandLogo'
import { isExistingConfigEdit, saveConfigValue } from './domain/configuration'
import { projectNameKey, resolveTaskProject, migrateLocalProjects } from './domain/projects'
import { saveRecord } from './domain/records'
import { backupKey, clearedKey, resetLocal, restoreLocal } from './domain/resetLocal'
import Icon, { navigationIcons } from './components/Icon'
import { translate, normalizeLocale } from './i18n/messages'
import { useTranslation, LanguageContext } from './i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, hasFirebaseConfig } from './firebase'
import { mockEns, mockBugs, mockLogs } from './mockData'
import Occurrences from './components/Occurrences'
import useScenarioExecution from './hooks/useScenarioExecution'
import { occurrenceActive } from './domain/occurrences'
import Scenarios from './components/Scenarios'
import ProjectOverview from './components/ProjectOverview'
import FlowCatalog from './components/FlowCatalog'
import useNavigation from './hooks/useNavigation'
import { APP_VERSION, COPYRIGHT, baseStatuses, bugStatuses, featureLabels, statusColor, tabs, taskTypes } from './constants'
import { cx, normalizeDate, uniq } from './utils'
import { Button, Card, ConfigList, EmptyState, Field, inputClass, LimitSelect, LogSection, RecordCard, SectionTitle, SelectField, StatCard, TaskRow } from './components/ui'
import useRecords, { saveLocalRecords } from './hooks/useRecords'
let projectMigrationError = ''
if (!hasFirebaseConfig) {
  try { migrateLocalProjects(localStorage) }
  catch { projectMigrationError = 'Unable to migrate existing projects. Original data was preserved.' }
}


const loggedQa = {
  name: 'Marcelo',
}

const defaultConfigData = {
  statuses: baseStatuses,
  taskTypes,
  projects: [],
  squads: ['Core Fibra', 'B2B Digital', 'CX App'],
  projectSquads: {},
}

function readLocalSetting(key, fallback) {
  if (typeof window === 'undefined') return fallback

  try {
    const value = JSON.parse(window.localStorage.getItem(key))
    if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

function loadConfigData() {
  const saved = readLocalSetting('quality-vision-config', {})
  return {
    statuses: Array.isArray(saved.statuses) ? saved.statuses : defaultConfigData.statuses,
    taskTypes: Array.isArray(saved.taskTypes) ? saved.taskTypes : defaultConfigData.taskTypes,
    projects: Array.isArray(saved.projects) ? saved.projects : defaultConfigData.projects,
    squads: Array.isArray(saved.squads) ? saved.squads : defaultConfigData.squads,
    projectSquads: {

      ...(saved.projectSquads && typeof saved.projectSquads === 'object' ? saved.projectSquads : {}),
    },
  }
}

function QaUserPill({ compact = false }) {
  const { t } = useTranslation()

  const [avatarError, setAvatarError] = useState(false)

  return (
    <div className={cx('flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] shadow-sm', compact && 'justify-center px-2')}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--blue-soft)] text-sm font-bold text-[var(--blue)] ring-1 ring-[var(--blue)]/20">
        {avatarError ? loggedQa.name.slice(0, 1) : <img src="/profile-photo.png?v=20260927" alt={t(`Foto de ${loggedQa.name}`)} className="h-full w-full object-cover" onError={() => setAvatarError(true)} />}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{loggedQa.name}</p>
        </div>
      )}
    </div>
  )
}

function SegmentedControl({ value, onChange, options }) {
  const { t } = useTranslation()

  return (
    <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1" role="tablist">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cx(
            'rounded-lg px-3 py-2 text-xs font-semibold transition',
            value === option
              ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
              : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
          )}
        >
          {t(label)}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useState(() => normalizeLocale(localStorage.getItem('quality-vision-language')))
  const t = (value) => translate(value, language)
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('quality-vision-theme')
    if (savedTheme) return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('quality-vision-sidebar') === 'collapsed')
  const { tab: activeTab, params: routeParams, navigate } = useNavigation()
  const setActiveTab = (tab) => navigate(tab)
  const [search, setSearch] = useState('')
  const [squadFilter, setSquadFilter] = useState('Todos')
  const [projectFilter, setProjectFilter] = useState('Todos')
  const [qaFilter, setQaFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const projectCatalog = useRecords('projects')
  const flowCatalog = useRecords('flows')
  const scenarioCatalog = useRecords('scenarios')
  const [tasksReady, setTasksReady] = useState(!hasFirebaseConfig)
  const [rawEns, setEns] = useState(() => readLocalSetting('quality-vision-ens', []))
  const ens = useMemo(() => rawEns.map(task => ({ ...task, projectId: resolveTaskProject(task, projectCatalog.records)?.id || task.projectId || '', project: resolveTaskProject(task, projectCatalog.records)?.name || task.project || t('Project unavailable') })), [rawEns, projectCatalog.records, language])
  useEffect(() => { if (!hasFirebaseConfig) saveLocalRecords('ens', rawEns) }, [rawEns])
  const bugRecords = useRecords('bugs')
  const bugs = bugRecords.records
  const impediments = useRecords('impacts')
  const execution = useScenarioExecution()
  const [logs, setLogs] = useState(() => readLocalSetting('quality-vision-logs', localStorage.getItem(clearedKey) ? [] : mockLogs))
  const [itemsPerPage, setItemsPerPage] = useState({ ens: 5, bugs: 5, logs: 5 })
  const [taskFilters, setTaskFilters] = useState({ status: 'Todos', squad: 'Todos', project: 'Todos', owner: 'Todos' })
  const [feedback, setFeedback] = useState(projectMigrationError)
  const [feedbackTone, setFeedbackTone] = useState('success')
  const [pendingDeleteTask, setPendingDeleteTask] = useState(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')
  const taskDialogRef = useRef(null)

  useEffect(() => {
    if (!taskModalOpen) return
    const dialog = taskDialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [taskModalOpen])

  const [newEn, setNewEn] = useState({ desc: '', status: 'Pendente', type: 'Testes', squad: '', projectId: '', owner: loggedQa.name })
  const [newBug, setNewBug] = useState({ desc: '', status: 'Novo', owner: '', developer: '', squad: '' })
  const [newLog, setNewLog] = useState('')
  const [editingEnId, setEditingEnId] = useState(null)
  const [editingBugId, setEditingBugId] = useState(null)
  const [editingLogId, setEditingLogId] = useState(null)

  const [settingsData, setConfigData] = useState(loadConfigData)
  const configData = { ...settingsData, projects: projectCatalog.records.map(p => p.name), projectSquads: Object.fromEntries(projectCatalog.records.map(p => [p.name, p.squad || ''])) }
  const [resetError, setResetError] = useState('')
  const hasResetBackup = Boolean(localStorage.getItem(backupKey))
  const clearLocalApplication = () => {
    try {
      resetLocal(localStorage, { ens, bugs, logs, config: configData })
      window.location.assign('/configuracoes')
    } catch { setResetError(t('Unable to reset local data.')) }
  }
  const restoreLocalApplication = () => {
    try { restoreLocal(localStorage); window.location.assign('/configuracoes') }
    catch { setResetError(t('Unable to restore local data.')) }
  }

  const [configForm, setConfigForm] = useState({ project: '', projectOwner: loggedQa.name, projectSquad: 'Core Fibra', squad: '', status: '', taskType: '' })
  const [editingConfig, setEditingConfig] = useState({ type: '', value: '' })
  const [catalogTab, setCatalogTab] = useState('projects')
  const [workflowTab, setWorkflowTab] = useState('status')
  const [configAddTarget, setConfigAddTarget] = useState('project')
  const [configurationTab, setConfigurationTab] = useState(() => routeParams.view === 'registrations' ? 'flows' : 'general')
  const [flowAddRequest, setFlowAddRequest] = useState(0)

  const showFeedback = (message, tone = 'success') => {
    setFeedbackTone(tone)
    setFeedback(message)
  }

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('quality-vision-language', language)
  }, [language])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#071B30' : '#0176D3')
    localStorage.setItem('quality-vision-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('quality-vision-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded')
  }, [sidebarCollapsed])

  useEffect(() => {
    const { projects, projectSquads, ...settings } = settingsData
    localStorage.setItem('quality-vision-config', JSON.stringify(settings))
  }, [settingsData])

  useEffect(() => {
    localStorage.removeItem('quality-vision-managers')
    localStorage.removeItem('quality-vision-qas')
  }, [])

  useEffect(() => {
    if (configData.taskTypes.includes(newEn.type)) return
    setNewEn((current) => ({ ...current, type: configData.taskTypes[0] || 'Testes' }))
  }, [configData.taskTypes, newEn.type])

  useEffect(() => {
    if (configData.squads.includes(configForm.projectSquad)) return
    setConfigForm((current) => ({ ...current, projectSquad: configData.squads[0] || '' }))
  }, [configData.squads, configForm.projectSquad])

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(''), 3200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (!hasFirebaseConfig || !db) return undefined

    const unsubEns = onSnapshot(collection(db, 'ens'), (snapshot) => {
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setEns(data)
      setTasksReady(true)
    }, () => setTasksReady(false))

    const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('createdAt', 'desc')), (snapshot) => {
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: normalizeDate(item.data().createdAt) }))
      setLogs(data)
    })

    return () => [unsubEns, unsubLogs].forEach((unsubscribe) => unsubscribe())
  }, [])

  const squads = useMemo(() => ['Todos', ...uniq([...configData.squads, ...ens.map((item) => item.squad), ...bugs.map((item) => item.squad)])], [configData.squads, ens, bugs])
  const projects = useMemo(() => ['Todos', ...uniq([...configData.projects, ...ens.map((item) => item.project)])], [configData.projects, ens])
  const qas = useMemo(() => ['Todos', ...uniq([loggedQa.name, ...ens.map((item) => item.owner)])], [ens])
  const taskStatuses = useMemo(() => uniq([...configData.statuses, ...ens.map((item) => item.status)]), [configData.statuses, ens])
  const projectSquads = useMemo(() => {
    const inferred = Object.fromEntries(ens.filter((item) => item.project && item.squad).map((item) => [item.project, item.squad]))
    return { ...inferred, ...configData.projectSquads }
  }, [configData.projectSquads, ens])

  const filteredEns = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ens.filter((item) => {
      const matchesSearch = !term || [item.id, item.desc, item.owner, item.project, item.squad].some((value) => value?.toLowerCase().includes(term))
      return matchesSearch &&
        (squadFilter === 'Todos' || item.squad === squadFilter) &&
        (projectFilter === 'Todos' || item.project === projectFilter) &&
        (qaFilter === 'Todos' || item.owner === qaFilter) &&
        (statusFilter === 'Todos' || item.status === statusFilter)
    })
  }, [ens, search, squadFilter, projectFilter, qaFilter, statusFilter])

  const filteredBugs = useMemo(() => bugs.filter((bug) => squadFilter === 'Todos' || bug.squad === squadFilter), [bugs, squadFilter])
  const dashboardStatuses = useMemo(
    () => uniq([...baseStatuses, ...configData.statuses, ...filteredEns.map((item) => item.status)]),
    [configData.statuses, filteredEns]
  )

  const stats = useMemo(() => {
    const total = filteredEns.length
    const counts = Object.fromEntries(dashboardStatuses.map((status) => [status, filteredEns.filter((item) => item.status === status).length]))
    const successRate = total ? Math.round((counts.Finalizado / total) * 100) : 0
    return { total, successRate, ...counts }
  }, [dashboardStatuses, filteredEns])

  const taskOverview = useMemo(() => {
    const attention = (stats.Bloqueado || 0) + (stats.Impactado || 0)
    const active = (stats['Em andamento'] || 0) + attention
    const activeFilters = [
      squadFilter !== 'Todos' && `Squad: ${squadFilter}`,
      projectFilter !== 'Todos' && `Project: ${projectFilter}`,
      qaFilter !== 'Todos' && `QA: ${qaFilter}`,
      statusFilter !== 'Todos' && `Status: ${statusFilter}`,
      search.trim() && `Search: ${search.trim()}`,
    ].filter(Boolean)

    return {
      active,
      attention,
      activeFilters,
      hasFilters: activeFilters.length > 0,
    }
  }, [projectFilter, qaFilter, search, squadFilter, stats, statusFilter])

  const homeInsights = useMemo(() => {
    const attentionItems = filteredEns
      .filter((item) => ['Bloqueado', 'Impactado'].includes(item.status))
      .slice(0, 3)

    return {
      completedLabel: `${stats.Finalizado || 0} of ${stats.total || 0} tasks completed`,
      activeFlow: (stats['Em andamento'] || 0) + (stats.Pendente || 0),
      attentionItems,
    }
  }, [filteredEns, stats])

  const canSaveTask = Boolean(newEn.desc.trim() && projectCatalog.records.some(p => p.id === newEn.projectId) && newEn.type && newEn.squad && newEn.owner.trim())

  const filteredTaskList = useMemo(() => ens.filter((item) => (
    (taskFilters.status === 'Todos' || item.status === taskFilters.status) &&
    (taskFilters.squad === 'Todos' || item.squad === taskFilters.squad) &&
    (taskFilters.project === 'Todos' || item.projectId === taskFilters.project) &&
    (taskFilters.owner === 'Todos' || item.owner === taskFilters.owner)
  )), [ens, taskFilters])

  const resetEn = () => {
    setEditingEnId(null)
    const project = projectFilter === 'Todos' ? projects.find((item) => item !== 'Todos') || '' : projectFilter
    setNewEn({ desc: '', status: 'Pendente', type: configData.taskTypes[0] || 'Testes', squad: projectSquads[project] || configData.squads[0] || '', projectId: projectCatalog.records.find(p => p.name === project)?.id || '', owner: loggedQa.name })
  }

  const resetLog = () => {
    setEditingLogId(null)
    setNewLog('')
  }

  const saveEn = async () => {
    if (!canSaveTask || savingTask) return
    setSavingTask(true)
    setTaskError('')
    try {
      const { project: legacyProjectName, ...taskData } = newEn
      const payload = { ...taskData, desc: newEn.desc.trim(), owner: newEn.owner.trim(), updatedAt: hasFirebaseConfig && db ? serverTimestamp() : normalizeDate(), updatedBy: loggedQa.name }
      if (hasFirebaseConfig && db) {
        if (editingEnId) await updateDoc(doc(db, 'ens', editingEnId), { ...payload, project: deleteField() })
        else await setDoc(doc(db, 'ens', `EN-${Date.now()}`), { ...payload, createdAt: serverTimestamp(), createdBy: loggedQa.name })
      } else if (editingEnId) {
        setEns((current) => current.map((item) => item.id === editingEnId ? { ...item, ...payload } : item))
      } else {
        setEns((current) => [{ id: `EN-${Date.now()}`, ...payload, createdAt: normalizeDate(), createdBy: loggedQa.name }, ...current])
      }
      showFeedback(editingEnId ? 'Alterações da tarefa salvas com sucesso.' : 'Tarefa cadastrada com sucesso.')
      resetEn()
      setTaskModalOpen(false)
    } catch {
      setTaskError('Não foi possível salvar a tarefa. Tente novamente.')
    } finally {
      setSavingTask(false)
    }
  }

  const saveLog = async () => {
    if (!newLog.trim()) return
    const message = newLog.trim()
    if (hasFirebaseConfig && db) {
      if (editingLogId) await updateDoc(doc(db, 'logs', editingLogId), { message })
      else await addDoc(collection(db, 'logs'), { message, createdAt: serverTimestamp(), createdBy: 'Marcelo' })
    } else if (editingLogId) {
      setLogs((current) => current.map((item) => item.id === editingLogId ? { ...item, message } : item))
    } else {
      setLogs((current) => [{ id: `LOG-${Date.now()}`, message, createdAt: normalizeDate(), createdBy: 'Marcelo' }, ...current])
    }
    resetLog()
  }

  const deleteEntity = async (collectionName, id, setter, reset) => {
    if (hasFirebaseConfig && db) await deleteDoc(doc(db, collectionName, id))
    else setter((current) => current.filter((item) => item.id !== id))
    reset()
  }

  const deleteTask = async () => {
    if (!pendingDeleteTask) return
    const { id } = pendingDeleteTask
    await deleteEntity('ens', id, setEns, resetEn)
    setPendingDeleteTask(null)
    showFeedback('Tarefa excluída com sucesso.')
  }

  const setLimit = (key, value) => setItemsPerPage((current) => ({ ...current, [key]: Number(value) }))

  const clearTaskFilters = () => {
    setSearch('')
    setSquadFilter('Todos')
    setProjectFilter('Todos')
    setQaFilter('Todos')
    setStatusFilter('Todos')
    setTaskFilters({ status: 'Todos', squad: 'Todos', project: 'Todos', owner: 'Todos' })
  }

  const openTasksByStatus = (status) => {
    setTaskFilters({ status, squad: 'Todos', project: 'Todos', owner: 'Todos' })
    setConfigurationTab('legacy-tasks')
    setActiveTab('Configuração')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveConfigItem = (type) => {
    const map = { squad: 'squads', status: 'statuses', taskType: 'taskTypes' }
    const key = map[type]
    const value = configForm[type]?.trim()
    if (!value) return
    const isEditing = isExistingConfigEdit(editingConfig, type, configData[key])
    if (type === 'status' && isEditing && editingConfig.value !== value && ens.some((task) => task.status === editingConfig.value)) {
      showFeedback('Status utilizados em tarefas não podem ser renomeados.', 'warning')
      return
    }
    if (type === 'taskType' && isEditing && editingConfig.value !== value && ens.some((task) => (task.type || 'Testes') === editingConfig.value)) {
      showFeedback('Tipos utilizados em tarefas não podem ser renomeados.', 'warning')
      return
    }
    if (type === 'squad' && isEditing && editingConfig.value !== value && (ens.some((task) => task.squad === editingConfig.value) || projectCatalog.records.some(p => p.squad === editingConfig.value))) {
      showFeedback('Equipes vinculadas a projetos ou tarefas não podem ser renomeadas.', 'warning')
      return
    }

    setConfigData((current) => {
      const next = {
        ...current,
        [key]: saveConfigValue(current[key], value, isEditing ? editingConfig.value : ''),
      }

      return next
    })

    setConfigForm((current) => ({ ...current, [type]: '' }))
    setEditingConfig({ type: '', value: '' })
    showFeedback(isEditing ? 'Configuração atualizada com sucesso.' : 'Configuração adicionada com sucesso.')
  }

  const projectSaveLock = useRef(false)
  const [savingProject, setSavingProject] = useState(false)
  const saveProject = async () => {
    if (projectSaveLock.current) return
    const name = configForm.project.trim()
    const current = projectCatalog.records.find(p => p.id === editingConfig.value)
    if (!name || !configForm.projectOwner?.trim()) return showFeedback('Enter a name and owner.', 'warning')
    if (projectCatalog.loading || projectCatalog.error || !tasksReady) return showFeedback('Unable to load projects.', 'warning')
    if (projectCatalog.records.some(p => p.id !== current?.id && projectNameKey(p.name) === projectNameKey(name))) return showFeedback('An item with this name already exists.', 'warning')
    projectSaveLock.current = true; setSavingProject(true)
    try {
      if (current) {
        const linkedTasks = rawEns.filter(task => !task.projectId && resolveTaskProject(task, projectCatalog.records)?.id === current.id)
        if (hasFirebaseConfig && db) {
          await Promise.all(linkedTasks.map(task => updateDoc(doc(db, 'ens', task.id), { projectId: current.id, project: deleteField(), updatedAt: serverTimestamp(), updatedBy: loggedQa.name })))
        } else if (linkedTasks.length) {
          setEns(tasks => tasks.map(task => {
            if (!linkedTasks.some(linked => linked.id === task.id)) return task
            const { project, ...record } = task
            return { ...record, projectId: current.id }
          }))
        }
      }
      await saveRecord('projects', current?.id, { name, owner: configForm.projectOwner.trim(), squad: configForm.projectSquad || '' }, loggedQa.name)
      resetConfigEditor()
      showFeedback('Projeto atualizado com sucesso.')
    } catch (error) { showFeedback(error.message, 'warning') } finally { projectSaveLock.current = false; setSavingProject(false) }
  }

  const deleteProject = async (project) => {
    if (!tasksReady || flowCatalog.loading || scenarioCatalog.loading || flowCatalog.error || scenarioCatalog.error || bugRecords.loading || impediments.loading || bugRecords.error || impediments.error) return showFeedback('Unable to verify project links.', 'warning')
    if (bugs.some(item => item.projectId === project.id) || impediments.records.some(item => item.projectId === project.id) || ens.some(task => task.projectId === project.id || (!task.projectId && projectNameKey(task.project) === projectNameKey(project.name))) || flowCatalog.records.some(flow => flow.projectId === project.id) || scenarioCatalog.records.some(scenario => scenario.projectId === project.id)) return showFeedback('Remove linked tasks, flows and scenarios before deleting this project.', 'warning')
    try {
      if (hasFirebaseConfig && db) await deleteDoc(doc(db, 'projects', project.id))
      else saveLocalRecords('projects', projectCatalog.records.filter(p => p.id !== project.id))
      showFeedback('Projeto removido com sucesso.')
    } catch (error) { showFeedback(error.message, 'warning') }
  }

  const deleteConfigItem = (key, item) => {
    if (key === 'statuses' && baseStatuses.includes(item)) {
      showFeedback('Os status padrão dos indicadores não podem ser removidos.', 'warning')
      return
    }
    if (key === 'taskTypes' && configData.taskTypes.length === 1) {
      showFeedback('Mantenha pelo menos um tipo de tarefa cadastrado.', 'warning')
      return
    }
    if (key === 'taskTypes' && ens.some((task) => (task.type || 'Testes') === item)) {
      showFeedback('Tipos utilizados em tarefas não podem ser removidos.', 'warning')
      return
    }
    if (key === 'statuses' && ens.some((task) => task.status === item)) {
      showFeedback('Status utilizados em tarefas não podem ser removidos.', 'warning')
      return
    }
    if (key === 'squads' && (Object.values(configData.projectSquads).includes(item) || ens.some((task) => task.squad === item))) {
      showFeedback('Squads associadas a projetos ou tarefas não podem ser removidas.', 'warning')
      return
    }

    setConfigData((current) => ({ ...current, [key]: current[key].filter((value) => value !== item) }))
    showFeedback('Configuração removida com sucesso.')
  }

  const resetConfigEditor = () => {
    setEditingConfig({ type: '', value: '' })
    setConfigForm({
      project: '',
      projectOwner: loggedQa.name,
      projectSquad: configData.squads[0] || '',
      squad: '',
      status: '',
      taskType: '',
    })
  }

  const changeCatalogTab = (tab) => {
    resetConfigEditor()
    setCatalogTab(tab)
    setConfigAddTarget(tab === 'projects' ? 'project' : 'squad')
  }

  const changeWorkflowTab = (tab) => {
    resetConfigEditor()
    setWorkflowTab(tab)
    setConfigAddTarget(tab)
  }

  const selectConfigurationTab = (tab) => {
    resetConfigEditor()
    setConfigurationTab(tab)
    if (['projects', 'squads'].includes(tab)) {
      setCatalogTab(tab)
      setConfigAddTarget(tab === 'projects' ? 'project' : 'squad')
    }
    if (['types', 'status'].includes(tab)) {
      setWorkflowTab(tab === 'types' ? 'taskType' : 'status')
      setConfigAddTarget(tab === 'types' ? 'taskType' : 'status')
    }
  }

  const configTarget = {
    project: { label: 'Projeto', tab: 'catalog' },
    squad: { label: 'Squad', tab: 'catalog' },
    status: { label: 'Status', tab: 'workflow' },
    taskType: { label: 'Tipo de tarefa', tab: 'workflow' },
  }[configAddTarget]
  const startConfigAdd = () => {
    resetConfigEditor()
    if (configTarget.tab === 'catalog') setCatalogTab(configAddTarget === 'project' ? 'projects' : 'squads')
    else setWorkflowTab(configAddTarget)
    setEditingConfig({ type: configAddTarget, value: '' })
  }
  const startConfigurationAdd = () => {
    if (configurationTab === 'flows') return setFlowAddRequest((current) => current + 1)
    if (configurationTab === 'legacy-tasks') {
      resetEn(); setTaskError(''); setTaskModalOpen(true); return
    }
    startConfigAdd()
  }


  const workflowConfig = workflowTab === 'status' ? { type: 'status', key: 'statuses', placeholder: 'Novo status' } : { type: 'taskType', key: 'taskTypes', placeholder: 'Novo tipo de tarefa' }

  return (
    <LanguageContext.Provider value={language}>
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
      <div className="flex min-h-screen">
        <aside className={cx('hidden shrink-0 p-4 transition-all duration-300 xl:block', sidebarCollapsed ? 'w-[112px]' : 'w-[304px]')}>
          <div className={cx('sticky top-4 flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex-col rounded-2xl bg-[var(--sidebar)] text-[var(--text)] shadow-2xl transition-all duration-300', sidebarCollapsed ? 'p-3' : 'p-4')}>
            <button
              onClick={() => setActiveTab(tabs[0])}
              aria-label={t("Quality Vision — início")}
              className={cx(
                'isolate flex shrink-0 items-center justify-center overflow-hidden rounded-[50%] border border-[var(--border)] bg-[var(--logo-bg)] transition hover:bg-[var(--logo-hover)]',
                sidebarCollapsed ? 'min-h-12 px-2 py-3' : 'min-h-32 px-10 py-6'
              )}
            >
              <BrandLogo theme={theme} compact={sidebarCollapsed} />
            </button>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.18)_transparent]">
              <nav id="sidebar-navigation" className="space-y-2">
                {tabs.map((item, index) => (
                  <button
                    key={item}
                    onClick={() => setActiveTab(item)}
                    className={cx(
                      'w-full rounded-2xl text-sm font-semibold transition',
                      sidebarCollapsed ? 'flex h-12 items-center justify-center px-0' : 'px-4 py-3 text-left',
                      activeTab === item ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm shadow-black/20' : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                    )}
                    title={t(sidebarCollapsed ? featureLabels[language][item] : undefined)}
                    aria-label={t(featureLabels[language][item])}
                  >
                    <span className="flex items-center gap-3"><Icon name={navigationIcons[item]} />{!sidebarCollapsed && featureLabels[language][item]}</span>
                  </button>
                ))}
              </nav>

            </div>

            <div className="mt-4 shrink-0 border-t border-[var(--border)] pt-3">
              <button type="button" onClick={() => setSidebarCollapsed(current => !current)}
                className={cx('flex min-h-12 w-full items-center gap-3 rounded-lg text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]', sidebarCollapsed ? 'justify-center px-0' : 'px-4')}
                aria-expanded={!sidebarCollapsed} aria-controls="sidebar-navigation"
                aria-label={t(sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral')}
                title={t(sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral')}>
                <Icon name="sidebar" />
                {!sidebarCollapsed && <span>{t('Recolher barra lateral')}</span>}
              </button>
            </div>
            <div className="shrink-0 pt-3">
              <div className={cx('rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-center text-xs font-medium leading-relaxed text-[var(--muted)]', sidebarCollapsed ? 'px-2 py-2' : 'px-4 py-2.5')}>
                {t(sidebarCollapsed ? APP_VERSION : `${COPYRIGHT} | ${APP_VERSION}`)}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_left,rgba(1,118,211,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(27,150,255,0.08),transparent_28%)]">
          <header className="sticky top-0 z-10 bg-[var(--bg)] px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">{t(activeTab === 'Home' ? (language === 'pt-BR' ? 'Painel Quality Vision' : 'Quality Vision Dashboard') : featureLabels[language][activeTab])}</h2>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <QaUserPill />
              </div>
            </div>
          </header>

          <div className="space-y-4 p-4 md:p-6">
            <nav aria-label={t(language === 'pt-BR' ? 'Menu principal' : 'Main menu')} className="flex flex-wrap gap-2 xl:hidden">{tabs.map((tab) => <Button key={tab} variant={tab === activeTab ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab)}><Icon name={navigationIcons[tab]} />{featureLabels[language][tab]}</Button>)}</nav>
            {feedback && (
              <div className={cx(
                'rounded-2xl border px-4 py-3 text-sm font-semibold',
                feedbackTone === 'warning'
                  ? 'border-[var(--orange)] bg-[var(--orange-soft)] text-[var(--orange)]'
                  : 'border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)]'
              )}>
                {t(feedback)}
              </div>
            )}

            {activeTab === tabs[0] && (
              <>
                {taskOverview.attention > 0 && <p className="rounded-xl border border-[var(--orange)] bg-[var(--orange-soft)] p-3 text-sm">{t('Prioritize blocked or impacted items before pulling new tasks.')}</p>}
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title={t("Total tasks")} value={stats.total}  />
                  <StatCard title={t("Completed")} value={stats.Finalizado} sub={t("View completed tasks")} onClick={() => openTasksByStatus('Finalizado')} />
                  <StatCard title={t("Blocked")} value={stats.Bloqueado} sub={t("View blocked tasks")} onClick={() => openTasksByStatus('Bloqueado')} />
                  <StatCard title={t("Impacted")} value={stats.Impactado} sub={t("View impacted tasks")} onClick={() => openTasksByStatus('Impactado')} />
                  <StatCard title={t("Open bugs")} value={bugs.filter(item => occurrenceActive(item, 'bugs')).length} onClick={() => navigate('Bugs')} />
                  <StatCard title={t("Active impediments")} value={impediments.records.filter(item => occurrenceActive(item, 'impacts')).length} onClick={() => navigate('Impactos')} />
                  <StatCard title={t("Blocked scenarios")} value={execution.records.filter(item => item.status === 'Bloqueado').length} onClick={() => navigate('Cenários', {status:'Bloqueado'})} />
                </section>

                <section className="grid min-w-0 grid-cols-1 gap-6 ">
                  <Card className="min-w-0">
                    <SectionTitle title={t("Items needing attention")} />
                    <div className="grid min-w-0 gap-3 md:grid-cols-2">
                      {homeInsights.attentionItems.map((item) => (
                        <RecordCard key={item.id} title={item.desc} status={item.status} meta={`${item.id} • ${item.type || 'Testes'} • ${item.project} • ${item.squad} • QA: ${item.owner}`} />
                      ))}
                      {!homeInsights.attentionItems.length && <EmptyState>{t("No blocked or impacted tasks right now.")}</EmptyState>}
                    </div>
                  </Card>
                </section>
              </>
            )}

            {activeTab === 'Configuração' && (
              <div className="flex items-start justify-between gap-3">
                <nav aria-label={t("Submenu de configuração")} className="flex flex-wrap gap-2">
                  {[['general', 'General'], ['squads', 'Squads'], ['projects', 'Projects'], ['flows', 'Flows'], ['types', 'Types'], ['status', 'Statuses']].map(([value, label]) => <Button key={value} variant={configurationTab === value ? 'primary' : 'secondary'} onClick={() => selectConfigurationTab(value)}>{t(label)}</Button>)}
                </nav>
                {configurationTab !== 'general' && !editingConfig.type && <Button disabled={configurationTab === 'flows' && !configData.projects.length} onClick={startConfigurationAdd}>{t("Adicionar")}</Button>}
              </div>
            )}

            {activeTab === 'Configuração' && configurationTab === 'flows' && <FlowCatalog owner={loggedQa.name} addRequest={flowAddRequest} />}

            {activeTab === 'Configuração' && configurationTab === 'legacy-tasks' && (
              <Card>
                <SectionTitle
                  title={t(`Tasks (${filteredTaskList.length})`)}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <LimitSelect value={itemsPerPage.ens} onChange={(e) => setLimit('ens', e.target.value)} />
                      <Button variant="secondary" onClick={clearTaskFilters}>{t("Clear filters")}</Button>
                    </div>
                  }
                />
                  <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text)]">{t("Quick filters")}</p>
                      <p className="text-xs text-[var(--muted)]">{t("Refine the list without changing Home")}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectField label={t("Status")} value={taskFilters.status} onChange={(e) => setTaskFilters((current) => ({ ...current, status: e.target.value }))} options={['Todos', ...taskStatuses]} />
                    <SelectField label={t("Squad")} value={taskFilters.squad} onChange={(e) => setTaskFilters((current) => ({ ...current, squad: e.target.value }))} options={squads} />
                    <SelectField label={t("Project")} value={taskFilters.project} onChange={(e) => setTaskFilters((current) => ({ ...current, project: e.target.value }))} options={[{ value: 'Todos', label: t('All projects') }, ...projectCatalog.records.map(p => ({ value: p.id, label: p.name }))]} />
                    <SelectField label={t("QA owner")} value={taskFilters.owner} onChange={(e) => setTaskFilters((current) => ({ ...current, owner: e.target.value }))} options={qas} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredTaskList.slice(0, itemsPerPage.ens).map((item) => <TaskRow key={item.id} task={item} onEdit={() => { setTaskError(''); setTaskModalOpen(true); setEditingEnId(item.id); setNewEn({ desc: item.desc, status: item.status, type: item.type || 'Testes', squad: item.squad, projectId: item.projectId, owner: item.owner }) }} onDelete={() => setPendingDeleteTask(item)} />)}
                    {!filteredTaskList.length && <EmptyState>{t("Nenhuma tarefa encontrada com os filtros atuais.")}</EmptyState>}
                  </div>
              </Card>
            )}

            {activeTab === 'Impactos' && <Occurrences key="impacts" kind="impacts" owner={loggedQa.name} />}
            {activeTab === 'Visão do Projeto' && <ProjectOverview owner={loggedQa.name} params={routeParams} navigate={navigate}  />}
            {activeTab === 'Cenários' && <Scenarios key={JSON.stringify(routeParams)} owner={loggedQa.name} params={routeParams} navigate={navigate} />}

            {activeTab === 'Bugs' && <Occurrences key="bugs" kind="bugs" owner={loggedQa.name} />}

            {activeTab === 'Configuração' && ['projects', 'squads', 'types', 'status'].includes(configurationTab) && (
              <Card>
                <div className="grid grid-cols-1 gap-6">
                {['projects', 'squads'].includes(configurationTab) && <div className="min-w-0">
                  {catalogTab === 'projects' ? (
                    <>
                      {editingConfig.type === 'project' && <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <Field label={t("Project name")}><input
                          value={configForm.project}
                          onChange={(event) => setConfigForm((current) => ({ ...current, project: event.target.value }))}
                          placeholder={t("Nome do projeto")}
                          className={inputClass}
                        />
                        </Field><Field label={t("Owner")}><input required className={inputClass} value={configForm.projectOwner || ''} onChange={e => setConfigForm(c => ({ ...c, projectOwner: e.target.value }))} /></Field>
                        <Field label={t("Squad")}><select
                          value={configForm.projectSquad}
                          onChange={(event) => setConfigForm((current) => ({ ...current, projectSquad: event.target.value }))}
                          className={inputClass}
                        >
                          <option value="">{t("Not assigned")}</option>
                          {configData.squads.map((squad) => <option key={squad} value={squad}>{squad}</option>)}
                        </select></Field>
                        <div className="flex gap-2">
                          {editingConfig.type === 'project' && <Button disabled={savingProject} onClick={saveProject}>{t('Save')}</Button>}
                          {editingConfig.type === 'project' && <Button variant="secondary" onClick={resetConfigEditor}>{t("Cancelar")}</Button>}
                        </div>
                      </div>}

                      <div className="mt-4 space-y-2">
                        {projectCatalog.records.map((project) => (
                          <div key={project.id} className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{project.name}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">{t("Squad: ")}{project.squad || t('Not assigned')} · {t('Owner')}: {project.owner}</p>
                            </div>
                            <div className="flex shrink-0 gap-2 opacity-80 transition group-hover:opacity-100">
                              <Button
                                variant="secondary"
                                className="px-3 py-1.5 text-xs"
                                onClick={() => {
                                  setEditingConfig({ type: 'project', value: project.id })
                                  setConfigAddTarget('project')
                                  setConfigForm((current) => ({
                                    ...current,
                                    project: project.name,
                                    projectOwner: project.owner,
                                    projectSquad: project.squad || configData.squads[0] || '',
                                  }))
                                }}
                              >{t(" Editar ")}</Button>
                              <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteProject(project)}>{t("Excluir")}</Button>
                            </div>
                          </div>
                        ))}
                        {projectCatalog.error && <p role="alert">{t(projectCatalog.error)}</p>}
                        {!projectCatalog.loading && !projectCatalog.error && !editingConfig.type && !configData.projects.length && <EmptyState>{t("Nenhum projeto configurado.")}</EmptyState>}
                      </div>
                    </>
                  ) : (
                    <>
                      {editingConfig.type === 'squad' && <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={configForm.squad}
                          onChange={(event) => setConfigForm((current) => ({ ...current, squad: event.target.value }))}
                          placeholder={t("Nome da squad")}
                          className={inputClass}
                        />
                        {editingConfig.type === 'squad' && <Button onClick={() => saveConfigItem('squad')}>{t('Save')}</Button>}
                        {editingConfig.type === 'squad' && <Button variant="secondary" onClick={resetConfigEditor}>{t("Cancelar")}</Button>}
                      </div>}
                      <ConfigList
                        items={configData.squads}
                        onEdit={(item) => {
                          setEditingConfig({ type: 'squad', value: item })
                          setConfigAddTarget('squad')
                          setConfigForm((current) => ({ ...current, squad: item }))
                        }}
                        onDelete={(item) => deleteConfigItem('squads', item)}
                      />
                    </>
                  )}
                </div>}

                {['types', 'status'].includes(configurationTab) && <div className="min-w-0">
                  {editingConfig.type === workflowConfig.type && <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={configForm[workflowConfig.type]}
                      onChange={(event) => setConfigForm((current) => ({ ...current, [workflowConfig.type]: event.target.value }))}
                      placeholder={t(workflowConfig.placeholder)}
                      className={inputClass}
                    />
                    {editingConfig.type === workflowConfig.type && <Button onClick={() => saveConfigItem(workflowConfig.type)}>{t('Save')}</Button>}
                    {editingConfig.type === workflowConfig.type && <Button variant="secondary" onClick={resetConfigEditor}>{t("Cancelar")}</Button>}
                  </div>}
                  <ConfigList
                    items={configData[workflowConfig.key]}
                    onEdit={(item) => {
                      if (workflowConfig.key === 'statuses' && baseStatuses.includes(item)) {
                        showFeedback('Os status padrão dos indicadores não podem ser alterados.', 'warning')
                        return
                      }
                      setEditingConfig({ type: workflowConfig.type, value: item })
                      setConfigAddTarget(workflowConfig.type)
                      setConfigForm((current) => ({ ...current, [workflowConfig.type]: item }))
                    }}
                    onDelete={(item) => deleteConfigItem(workflowConfig.key, item)}
                  />
                </div>}
                </div>
              </Card>
            )}

            {activeTab === 'Configuração' && configurationTab === 'general' && (
              <Card>
                {!hasFirebaseConfig && <div className="mb-4 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">{t('Local application data')}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{t('Clear projects and related records. A recovery copy remains available until restored. Appearance and language are preserved.')}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {!hasResetBackup && <Button variant="danger" onClick={clearLocalApplication}>{t('Clear local data')}</Button>}
                    {hasResetBackup && <Button variant="secondary" onClick={restoreLocalApplication}>{t('Restore data before reset')}</Button>}
                  </div>
                  {hasResetBackup && <p className="mt-2 text-sm">{t('Recovery copy available. Restoring replaces current local records.')}</p>}
                  {resetError && <p role="alert" className="mt-2 text-sm text-[var(--failure)]">{resetError}</p>}
                </div>}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="font-semibold">{t(language === 'pt-BR' ? 'Idioma' : 'Language')}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{t(language === 'pt-BR' ? 'Escolha o idioma da interface.' : 'Choose the interface language.')}</p>
                    <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[var(--text)]">
                      <span className="text-sm font-semibold text-[var(--muted)]">{t(language === 'pt-BR' ? 'Idioma da interface' : 'Interface language')}</span>
                      <select value={language} onChange={(event) => setLanguage(event.target.value)} className={inputClass}>
                        <option value="pt-BR">{t("Português (Brasil)")}</option>
                        <option value="en-US">{t("English (United States)")}</option>
                      </select>
                    </label>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="font-semibold">{t(language === 'pt-BR' ? 'Aparência' : 'Appearance')}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{t(language === 'pt-BR' ? 'Altere o tema visual da aplicação.' : 'Change the application theme.')}</p>
                    <Button className="mt-4" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>{t(theme === 'dark' ? (language === 'pt-BR' ? 'Usar modo claro' : 'Use light mode') : (language === 'pt-BR' ? 'Usar modo noturno' : 'Use dark mode'))}</Button>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="font-semibold">{t(language === 'pt-BR' ? 'Barra lateral' : 'Sidebar')}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{t(language === 'pt-BR' ? 'Escolha entre o menu completo ou compacto.' : 'Choose between the full or compact menu.')}</p>
                    <Button className="mt-4" onClick={() => setSidebarCollapsed((current) => !current)}>{t(sidebarCollapsed ? (language === 'pt-BR' ? 'Expandir barra lateral' : 'Expand sidebar') : (language === 'pt-BR' ? 'Recolher barra lateral' : 'Collapse sidebar'))}</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
      {taskModalOpen && (
        <dialog
          ref={taskDialogRef}
          aria-labelledby="task-dialog-title"
          onCancel={(event) => { event.preventDefault(); if (!savingTask) setTaskModalOpen(false) }}
          className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--modal)] p-6 text-[var(--text)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        >
          <form onSubmit={(event) => { event.preventDefault(); saveEn() }}>
            <h3 id="task-dialog-title" className="text-xl font-semibold">{t(editingEnId ? 'Editar tarefa' : 'Adicionar Tarefa')}</h3>
            <fieldset disabled={savingTask} className="mt-4 grid min-w-0 grid-cols-1 gap-4 border-0 p-0 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label={t("Descrição Tarefa")}>
                  <textarea autoFocus required rows={3} value={newEn.desc} onChange={(event) => setNewEn((current) => ({ ...current, desc: event.target.value }))} placeholder={t("Ex: Validar fluxo de contratação digital")} className={inputClass} />
                </Field>
              </div>
              <SelectField label={t("Tipo de tarefa")} value={newEn.type} onChange={(event) => setNewEn((current) => ({ ...current, type: event.target.value }))} options={configData.taskTypes.length ? configData.taskTypes : taskTypes} />
              <SelectField label={t("Projeto")} value={newEn.projectId || ''} onChange={(event) => {
                const project = projectCatalog.records.find(p => p.id === event.target.value)
                setNewEn((current) => ({ ...current, projectId: project?.id || '', squad: project?.squad || current.squad }))
              }} options={[{value: '', label: t('Select a project')}, ...projectCatalog.records.map(p => ({value:p.id, label:p.name}))]} />
              <SelectField label={t("Squad")} value={newEn.squad} onChange={(event) => setNewEn((current) => ({ ...current, squad: event.target.value }))} options={squads.filter((item) => item !== 'Todos')} />
              <SelectField label={t("Responsável QA")} value={newEn.owner} onChange={(event) => setNewEn((current) => ({ ...current, owner: event.target.value }))} options={qas.filter((item) => item !== 'Todos')} />
              {editingEnId && <SelectField label={t("Status")} value={newEn.status} onChange={(event) => setNewEn((current) => ({ ...current, status: event.target.value }))} options={taskStatuses} />}
            </fieldset>
            {taskError && <p role="alert" className="mt-4 text-sm text-[var(--red)]">{t(taskError)}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" disabled={savingTask} onClick={() => setTaskModalOpen(false)}>{t("Cancelar")}</Button>
              <Button type="submit" disabled={!canSaveTask || savingTask}>{t(savingTask ? 'Salvando...' : editingEnId ? 'Salvar alterações' : 'Salvar tarefa')}</Button>
            </div>
          </form>
        </dialog>
      )}
      {pendingDeleteTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteTask(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--modal)] p-6 text-[var(--text)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--red)]">{t("Excluir tarefa")}</p>
            <h3 id="delete-task-title" className="mt-2 text-xl font-semibold">{t("Confirmar exclusão?")}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t("A tarefa")}{pendingDeleteTask.id}{t("será removida permanentemente. Essa ação não pode ser desfeita.")}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingDeleteTask(null)}>{t("Cancelar")}</Button>
              <Button variant="danger" onClick={deleteTask}>{t("Excluir tarefa")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </LanguageContext.Provider>
  )
}
