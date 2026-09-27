import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import {
  addDoc,
  collection,
  deleteDoc,
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
import Impacts from './components/Impacts'
import Scenarios from './components/Scenarios'
import ProjectOverview from './components/ProjectOverview'
import FlowCatalog from './components/FlowCatalog'
import useNavigation from './hooks/useNavigation'
import { APP_VERSION, COPYRIGHT, baseStatuses, bugStatuses, featureLabels, statusColor, tabs, taskTypes } from './constants'
import { cx, normalizeDate, uniq } from './utils'
import { Button, Card, ConfigList, EmptyState, Field, inputClass, LimitSelect, LogSection, RecordCard, SectionTitle, SelectField, StatCard, TaskRow } from './components/ui'
import { saveLocalRecords } from './hooks/useRecords'
import seedFlows from '../firebase/seed/flows.json'

ChartJS.register(ArcElement, Tooltip, Legend)

const loggedQa = {
  name: 'Marcelo',
}

const defaultProjectSquads = {
  'Portal Comercial B2C': 'Core Fibra',
  'Upgrade Jornada': 'B2B Digital',
  'Onboarding App': 'CX App',
  'Campanha Flash': 'B2B Digital',
}

const defaultConfigData = {
  statuses: baseStatuses,
  taskTypes,
  projects: ['Portal Comercial B2C', 'Upgrade Jornada', 'Onboarding App', 'Campanha Flash'],
  squads: ['Core Fibra', 'B2B Digital', 'CX App'],
  projectSquads: defaultProjectSquads,
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
      ...defaultConfigData.projectSquads,
      ...(saved.projectSquads && typeof saved.projectSquads === 'object' ? saved.projectSquads : {}),
    },
  }
}

function projectRecordId(name) {
  return `project-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function SidebarToggleIcon({ collapsed }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative block h-6 w-8 rounded-[7px] border-2 border-current">
        <span className="absolute bottom-0 left-[9px] top-0 border-l-2 border-current" />
      </span>
      <span className={cx('text-base leading-none transition-transform', collapsed ? '-rotate-90' : 'rotate-0')}>⌄</span>
    </span>
  )
}

function QaUserPill({ compact = false }) {
  const [avatarError, setAvatarError] = useState(false)

  return (
    <div className={cx('flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] shadow-sm', compact && 'justify-center px-2')}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--blue-soft)] text-sm font-bold text-[var(--blue)] ring-1 ring-[var(--blue)]/20">
        {avatarError ? loggedQa.name.slice(0, 1) : <img src="/profile-photo.png?v=20260927" alt={`Foto de ${loggedQa.name}`} className="h-full w-full object-cover" onError={() => setAvatarError(true)} />}
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
          {label}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('quality-vision-language') || 'pt-BR')
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
  const [ens, setEns] = useState(mockEns)
  const [bugs, setBugs] = useState(mockBugs)
  const [logs, setLogs] = useState(mockLogs)
  const [itemsPerPage, setItemsPerPage] = useState({ ens: 5, bugs: 5, logs: 5 })
  const [taskFilters, setTaskFilters] = useState({ status: 'Todos', squad: 'Todos', project: 'Todos', owner: 'Todos' })
  const [feedback, setFeedback] = useState('')
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

  const [newEn, setNewEn] = useState({ desc: '', status: 'Pendente', type: 'Testes', squad: 'Core Fibra', project: 'Portal Comercial B2C', owner: loggedQa.name })
  const [newBug, setNewBug] = useState({ desc: '', status: 'Novo', owner: '', developer: '', squad: 'Core Fibra' })
  const [newLog, setNewLog] = useState('')
  const [editingEnId, setEditingEnId] = useState(null)
  const [editingBugId, setEditingBugId] = useState(null)
  const [editingLogId, setEditingLogId] = useState(null)

  const [configData, setConfigData] = useState(loadConfigData)
  const [configForm, setConfigForm] = useState({ project: '', projectSquad: 'Core Fibra', squad: '', status: '', taskType: '' })
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
    localStorage.setItem('quality-vision-config', JSON.stringify(configData))
  }, [configData])

  useEffect(() => {
    const projectRecords = configData.projects.map((name) => ({
      id: projectRecordId(name),
      name,
      owner: loggedQa.name,
      squad: configData.projectSquads[name] || '',
    }))

    if (hasFirebaseConfig && db) {
      Promise.all(projectRecords.map(({ id, ...data }) => setDoc(doc(db, 'projects', id), data, { merge: true }))).catch(() => {})
      return
    }

    try {
      const stored = JSON.parse(localStorage.getItem('quality-vision-projects') || '[]')
      const existing = Array.isArray(stored) ? stored : []
      const merged = [...existing]
      projectRecords.forEach((record) => {
        const index = merged.findIndex((item) => item.id === record.id)
        if (index === -1) merged.push(record)
        else merged[index] = { ...merged[index], ...record }
      })
      if (merged.length !== existing.length || projectRecords.some((record) => existing.some((item) => item.id === record.id && (item.name !== record.name || item.squad !== record.squad)))) saveLocalRecords('projects', merged)
    } catch {
      saveLocalRecords('projects', projectRecords)
    }
  }, [configData.projects, configData.projectSquads])

  useEffect(() => {
    if (hasFirebaseConfig && db) return
    try {
      const stored = JSON.parse(localStorage.getItem('quality-vision-flows') || '[]')
      const existing = Array.isArray(stored) ? stored : []
      const posnetFlows = seedFlows.filter((flow) => flow.projectId === 'project-posnet')
      const missing = posnetFlows.filter((seed) => !existing.some((flow) => flow.projectId === seed.projectId && flow.name.toLocaleLowerCase('pt-BR') === seed.name.toLocaleLowerCase('pt-BR')))
      if (missing.length) saveLocalRecords('flows', [...existing, ...missing])
    } catch {
      saveLocalRecords('flows', seedFlows.filter((flow) => flow.projectId === 'project-posnet'))
    }
  }, [])

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
    })

    const unsubBugs = onSnapshot(collection(db, 'bugs'), (snapshot) => {
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setBugs(data)
    })

    const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('createdAt', 'desc')), (snapshot) => {
      const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data(), createdAt: normalizeDate(item.data().createdAt) }))
      setLogs(data)
    })

    return () => [unsubEns, unsubBugs, unsubLogs].forEach((unsubscribe) => unsubscribe())
  }, [])

  const squads = useMemo(() => ['Todos', ...uniq([...configData.squads, ...ens.map((item) => item.squad), ...bugs.map((item) => item.squad)])], [configData.squads, ens, bugs])
  const projects = useMemo(() => ['Todos', ...uniq([...configData.projects, ...ens.map((item) => item.project)])], [configData.projects, ens])
  const qas = useMemo(() => ['Todos', ...uniq([loggedQa.name, ...ens.map((item) => item.owner)])], [ens])
  const taskStatuses = useMemo(() => uniq([...configData.statuses, ...ens.map((item) => item.status)]), [configData.statuses, ens])
  const projectSquads = useMemo(() => {
    const inferred = Object.fromEntries(ens.filter((item) => item.project && item.squad).map((item) => [item.project, item.squad]))
    return { ...defaultProjectSquads, ...inferred, ...configData.projectSquads }
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

  const canSaveTask = Boolean(newEn.desc.trim() && newEn.project.trim() && newEn.type && newEn.squad && newEn.owner.trim())

  const filteredTaskList = useMemo(() => ens.filter((item) => (
    (taskFilters.status === 'Todos' || item.status === taskFilters.status) &&
    (taskFilters.squad === 'Todos' || item.squad === taskFilters.squad) &&
    (taskFilters.project === 'Todos' || item.project === taskFilters.project) &&
    (taskFilters.owner === 'Todos' || item.owner === taskFilters.owner)
  )), [ens, taskFilters])

  const doughnutData = useMemo(() => ({
    labels: dashboardStatuses,
    datasets: [{
      data: dashboardStatuses.map((status) => stats[status]),
      backgroundColor: dashboardStatuses.map((status) => (theme === 'dark' ? { Finalizado: '#34D399', 'Em andamento': '#78C4FF', Bloqueado: '#FB923C', Impactado: '#FB923C', Pendente: '#9CA3AF' }[status] : statusColor[status]) || '#6B7280'),
      borderWidth: 0,
    }],
  }), [dashboardStatuses, stats, theme])

  const resetEn = () => {
    setEditingEnId(null)
    const project = projectFilter === 'Todos' ? projects.find((item) => item !== 'Todos') || '' : projectFilter
    setNewEn({ desc: '', status: 'Pendente', type: configData.taskTypes[0] || 'Testes', squad: projectSquads[project] || configData.squads[0] || '', project, owner: loggedQa.name })
  }

  const resetBug = () => {
    setEditingBugId(null)
    setNewBug({ desc: '', status: 'Novo', owner: '', developer: '', squad: squadFilter === 'Todos' ? 'Core Fibra' : squadFilter })
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
      const payload = { ...newEn, desc: newEn.desc.trim(), owner: newEn.owner.trim(), updatedAt: hasFirebaseConfig && db ? serverTimestamp() : normalizeDate(), updatedBy: loggedQa.name }
      if (hasFirebaseConfig && db) {
        if (editingEnId) await updateDoc(doc(db, 'ens', editingEnId), payload)
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

  const saveBug = async () => {
    if (!newBug.desc.trim() || !newBug.owner.trim()) return
    const payload = { ...newBug, desc: newBug.desc.trim(), owner: newBug.owner.trim(), updatedAt: hasFirebaseConfig && db ? serverTimestamp() : normalizeDate(), updatedBy: 'Marcelo' }
    if (hasFirebaseConfig && db) {
      if (editingBugId) await updateDoc(doc(db, 'bugs', editingBugId), payload)
      else await setDoc(doc(db, 'bugs', `BUG-${Date.now()}`), { ...payload, createdAt: serverTimestamp(), createdBy: 'Marcelo' })
    } else if (editingBugId) {
      setBugs((current) => current.map((item) => item.id === editingBugId ? { ...item, ...payload } : item))
    } else {
      setBugs((current) => [{ id: `BUG-${Date.now()}`, ...payload, createdAt: normalizeDate(), createdBy: 'Marcelo' }, ...current])
    }
    resetBug()
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
    setConfigurationTab('registrations')
    setActiveTab('Configuração')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveConfigItem = (type) => {
    const map = { squad: 'squads', status: 'statuses', taskType: 'taskTypes' }
    const key = map[type]
    const value = configForm[type]?.trim()
    if (!value) return
    if (type === 'status' && editingConfig.type === 'status' && editingConfig.value !== value && ens.some((task) => task.status === editingConfig.value)) {
      showFeedback('Status utilizados em tarefas não podem ser renomeados.', 'warning')
      return
    }
    if (type === 'taskType' && editingConfig.type === 'taskType' && editingConfig.value !== value && ens.some((task) => (task.type || 'Testes') === editingConfig.value)) {
      showFeedback('Tipos utilizados em tarefas não podem ser renomeados.', 'warning')
      return
    }
    if (type === 'squad' && editingConfig.type === 'squad' && editingConfig.value !== value && ens.some((task) => task.squad === editingConfig.value)) {
      showFeedback('Squads com tarefas cadastradas não podem ser renomeadas.', 'warning')
      return
    }

    setConfigData((current) => {
      const isEditing = editingConfig.type === type
      const next = {
        ...current,
        [key]: isEditing
          ? current[key].map((item) => item === editingConfig.value ? value : item)
          : current[key].includes(value) ? current[key] : [...current[key], value],
      }

      if (type === 'squad' && isEditing) {
        next.projectSquads = Object.fromEntries(
          Object.entries(current.projectSquads).map(([project, squad]) => [project, squad === editingConfig.value ? value : squad])
        )
      }

      return next
    })

    setConfigForm((current) => ({ ...current, [type]: '' }))
    setEditingConfig({ type: '', value: '' })
    showFeedback(editingConfig.type === type ? 'Configuração atualizada com sucesso.' : 'Configuração adicionada com sucesso.')
  }

  const saveProject = () => {
    const project = configForm.project.trim()
    const squad = configForm.projectSquad
    if (!project || !squad) {
      showFeedback('Informe o nome do projeto e sua squad.', 'warning')
      return
    }
    if (editingConfig.type === 'project' && editingConfig.value !== project && configData.projects.includes(project)) {
      showFeedback('Já existe um projeto com esse nome.', 'warning')
      return
    }
    if (editingConfig.type === 'project' && editingConfig.value !== project && ens.some((item) => item.project === editingConfig.value)) {
      showFeedback('Projetos com tarefas cadastradas não podem ser renomeados.', 'warning')
      return
    }

    setConfigData((current) => {
      const previousProject = editingConfig.type === 'project' ? editingConfig.value : ''
      const projectSquads = { ...current.projectSquads }

      if (previousProject && previousProject !== project) delete projectSquads[previousProject]
      projectSquads[project] = squad

      return {
        ...current,
        projects: previousProject
          ? current.projects.map((item) => item === previousProject ? project : item)
          : current.projects.includes(project) ? current.projects : [...current.projects, project],
        projectSquads,
      }
    })

    setConfigForm((current) => ({ ...current, project: '', projectSquad: configData.squads[0] || '' }))
    setEditingConfig({ type: '', value: '' })
    showFeedback(editingConfig.type === 'project' ? 'Projeto atualizado com sucesso.' : 'Projeto adicionado com sucesso.')
  }

  const deleteProject = (project) => {
    if (ens.some((item) => item.project === project)) {
      showFeedback('Projetos com tarefas cadastradas não podem ser removidos.', 'warning')
      return
    }

    setConfigData((current) => {
      const projectSquads = { ...current.projectSquads }
      delete projectSquads[project]
      return {
        ...current,
        projects: current.projects.filter((item) => item !== project),
        projectSquads,
      }
    })
    showFeedback('Projeto removido com sucesso.')
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

  const doughnutOptions = useMemo(() => {
    const muted = theme === 'dark' ? '#CBD5E1' : '#526B82'
    return {
      cutout: '58%',
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, usePointStyle: true, color: muted },
        },
      },
    }
  }, [theme])

  const workflowConfig = workflowTab === 'status'
    ? { type: 'status', key: 'statuses', placeholder: 'Novo status' }
    : { type: 'taskType', key: 'taskTypes', placeholder: 'Novo tipo de tarefa' }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
      <div className="flex min-h-screen">
        <aside className={cx('hidden shrink-0 p-4 transition-all duration-300 xl:block', sidebarCollapsed ? 'w-[112px]' : 'w-[304px]')}>
          <div className={cx('sticky top-4 flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex-col rounded-[32px] bg-[var(--sidebar)] text-[var(--text)] shadow-2xl transition-all duration-300', sidebarCollapsed ? 'p-3' : 'p-5')}>
            <div className="mb-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className={cx('rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[var(--text)] transition hover:bg-[var(--hover)] hover:text-[var(--blue)]', sidebarCollapsed && 'mx-auto')}
                aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                <SidebarToggleIcon collapsed={sidebarCollapsed} />
              </button>
            </div>

            <button
              onClick={() => setActiveTab(tabs[0])}
              aria-label="Quality Vision — início"
              className={cx(
                'isolate shrink-0 overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--logo-bg)] text-left transition hover:bg-[var(--logo-hover)]',
                sidebarCollapsed ? 'h-16 p-2' : 'p-0'
              )}
            >
              <img
                src="/quality-vision-logo.png?v=20260927"
                alt="Quality Vision"
                className={cx('quality-vision-logo block w-full object-cover', sidebarCollapsed ? 'h-full object-[50%_50%]' : 'aspect-[2/1] scale-[1.24] object-cover')}
              />
            </button>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.18)_transparent]">
              <nav className="space-y-2">
                {tabs.map((item, index) => (
                  <button
                    key={item}
                    onClick={() => setActiveTab(item)}
                    className={cx(
                      'w-full rounded-2xl text-sm font-semibold transition',
                      sidebarCollapsed ? 'flex h-12 items-center justify-center px-0' : 'px-4 py-3 text-left',
                      activeTab === item ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm shadow-black/20' : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                    )}
                    title={sidebarCollapsed ? featureLabels[language][item] : undefined}
                    aria-label={featureLabels[language][item]}
                  >
                    {sidebarCollapsed ? ['H', 'VP', 'C', 'I', 'CO'][index] : featureLabels[language][item]}
                  </button>
                ))}
              </nav>

            </div>

            <div className="shrink-0 pt-4">
              <div className={cx('rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-center text-[11px] font-medium leading-relaxed text-[var(--muted)]', sidebarCollapsed ? 'px-2 py-2' : 'px-4 py-2.5')}>
                {sidebarCollapsed ? APP_VERSION : `${COPYRIGHT} | ${APP_VERSION}`}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(1,118,211,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(27,150,255,0.08),transparent_28%)]">
          <header className="sticky top-0 z-10 bg-[var(--bg)] px-5 py-5 backdrop-blur-xl md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight">{activeTab === 'Home' ? (language === 'pt-BR' ? '🏠 Dashboard Quality Vision' : '🏠 Quality Vision Dashboard') : featureLabels[language][activeTab]}</h2>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <QaUserPill />
              </div>
            </div>
          </header>

          <div className="space-y-4 p-4 md:p-6">
            <nav aria-label={language === 'pt-BR' ? 'Menu principal' : 'Main menu'} className="flex flex-wrap gap-2 xl:hidden">{tabs.map((tab) => <Button key={tab} variant={tab === activeTab ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab)}>{featureLabels[language][tab]}</Button>)}</nav>
            {feedback && (
              <div className={cx(
                'rounded-3xl border px-4 py-3 text-sm font-semibold',
                feedbackTone === 'warning'
                  ? 'border-[var(--orange)] bg-[var(--orange-soft)] text-[var(--orange)]'
                  : 'border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)]'
              )}>
                {feedback}
              </div>
            )}

            {activeTab === tabs[0] && (
              <>
                <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                  <Card className="overflow-hidden bg-[linear-gradient(135deg,var(--surface)_0%,var(--surface-muted)_54%,var(--purple-soft)_100%)] p-0">
                    <div className="relative p-6 md:p-7">
                      <div className="absolute right-[-72px] top-[-90px] h-56 w-56 rounded-full bg-[var(--purple)] opacity-20 blur-3xl" />
                      <div className="absolute bottom-[-110px] left-[32%] h-64 w-64 rounded-full bg-[var(--blue)] opacity-10 blur-3xl" />
                      <div className="relative grid gap-5 lg:grid-cols-[1fr_200px] lg:items-center">
                        <div>
                          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-[var(--text)] md:text-5xl">
                            Quality executive dashboard.
                          </h1>
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">
                            Monitor task health, risks, and delivery progress in one focused decision-making view.
                          </p>
                        </div>
                        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-3 shadow-soft">
                          <div
                            className="flex h-full w-full flex-col items-center justify-center rounded-full text-center"
                            style={{ background: `conic-gradient(var(--green) ${stats.successRate * 3.6}deg, var(--surface-muted) 0deg)` }}
                          >
                            <div className="flex h-[78%] w-[78%] flex-col items-center justify-center rounded-full bg-[var(--surface)]">
                              <span className="text-5xl font-semibold tracking-tight text-[var(--text)]">{stats.successRate}%</span>
                              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Success rate</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="flex flex-col justify-between">
                    <SectionTitle title="Next focus" />
                    <div className={cx('rounded-3xl border p-5', taskOverview.attention ? 'border-[var(--orange)] bg-[var(--orange-soft)]' : 'border-[var(--green)] bg-[var(--green-soft)]')}>
                      <p className={cx('text-5xl font-semibold tracking-tight', taskOverview.attention ? 'text-[var(--orange)]' : 'text-[var(--green)]')}>{taskOverview.attention}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">At-risk items</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text)]">
                        {taskOverview.attention ? 'Prioritize blocked or impacted items before pulling new tasks.' : 'No critical blockers in the current view.'}
                      </p>
                    </div>
                  </Card>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Total tasks" value={stats.total} sub="Mapped tasks" />
                  <StatCard title="Completed" value={stats.Finalizado} sub="View completed tasks" onClick={() => openTasksByStatus('Finalizado')} />
                  <StatCard title="Blocked" value={stats.Bloqueado} sub="View blocked tasks" onClick={() => openTasksByStatus('Bloqueado')} />
                  <StatCard title="Impacted" value={stats.Impactado} sub="View impacted tasks" onClick={() => openTasksByStatus('Impactado')} />
                  <StatCard title="Total bugs" value={filteredBugs.length} sub="Defects in context" />
                </section>

                <section className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                  <Card className="min-w-0">
                    <SectionTitle title="Task status" />
                    <div className="h-[300px]"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
                  </Card>

                  <Card className="min-w-0">
                    <SectionTitle title="Items needing attention" />
                    <div className="grid min-w-0 gap-3 md:grid-cols-2">
                      {homeInsights.attentionItems.map((item) => (
                        <RecordCard key={item.id} title={item.desc} status={item.status} meta={`${item.id} • ${item.type || 'Testes'} • ${item.project} • ${item.squad} • QA: ${item.owner}`} />
                      ))}
                      {!homeInsights.attentionItems.length && <EmptyState>No blocked or impacted tasks right now.</EmptyState>}
                    </div>
                  </Card>
                </section>
              </>
            )}

            {activeTab === 'Configuração' && (
              <div className="flex items-start justify-between gap-3">
                <nav aria-label="Submenu de configuração" className="flex flex-wrap gap-2">
                  {[['general', 'General'], ['projects', 'Projects'], ['flows', 'Flows'], ['squads', 'Squads'], ['types', 'Types'], ['status', 'Statuses']].map(([value, label]) => <Button key={value} variant={configurationTab === value ? 'primary' : 'secondary'} onClick={() => selectConfigurationTab(value)}>{label}</Button>)}
                </nav>
                {configurationTab !== 'general' && <Button disabled={configurationTab === 'flows' && !configData.projects.length} onClick={startConfigurationAdd}>Adicionar</Button>}
              </div>
            )}

            {activeTab === 'Configuração' && configurationTab === 'flows' && <FlowCatalog owner={loggedQa.name} addRequest={flowAddRequest} />}

            {activeTab === 'Configuração' && configurationTab === 'legacy-tasks' && (
              <Card>
                <SectionTitle
                  title={`Tasks (${filteredTaskList.length})`}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <LimitSelect value={itemsPerPage.ens} onChange={(e) => setLimit('ens', e.target.value)} />
                      <Button variant="secondary" onClick={clearTaskFilters}>Clear filters</Button>
                    </div>
                  }
                />
                  <div className="mb-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text)]">Quick filters</p>
                      <p className="text-xs text-[var(--muted)]">Refine the list without changing Home</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectField label="Status" value={taskFilters.status} onChange={(e) => setTaskFilters((current) => ({ ...current, status: e.target.value }))} options={['Todos', ...taskStatuses]} />
                    <SelectField label="Squad" value={taskFilters.squad} onChange={(e) => setTaskFilters((current) => ({ ...current, squad: e.target.value }))} options={squads} />
                    <SelectField label="Project" value={taskFilters.project} onChange={(e) => setTaskFilters((current) => ({ ...current, project: e.target.value }))} options={projects} />
                    <SelectField label="QA owner" value={taskFilters.owner} onChange={(e) => setTaskFilters((current) => ({ ...current, owner: e.target.value }))} options={qas} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredTaskList.slice(0, itemsPerPage.ens).map((item) => <TaskRow key={item.id} task={item} onEdit={() => { setTaskError(''); setTaskModalOpen(true); setEditingEnId(item.id); setNewEn({ desc: item.desc, status: item.status, type: item.type || 'Testes', squad: item.squad, project: item.project, owner: item.owner }) }} onDelete={() => setPendingDeleteTask(item)} />)}
                    {!filteredTaskList.length && <EmptyState>Nenhuma tarefa encontrada com os filtros atuais.</EmptyState>}
                  </div>
              </Card>
            )}

            {activeTab === 'Impactos' && <Impacts tasks={ens} owner={loggedQa.name} />}
            {activeTab === 'Visão do Projeto' && <ProjectOverview owner={loggedQa.name} params={routeParams} navigate={navigate} legacyProjects={configData.projects} />}
            {activeTab === 'Cenários' && <Scenarios key={JSON.stringify(routeParams)} owner={loggedQa.name} params={routeParams} navigate={navigate} />}

            {activeTab === 'Bugs' && (
              <Card>
                <SectionTitle eyebrow="Histórico de Defeitos" title={editingBugId ? 'Editar bug' : 'Cadastro e rastreio de desvios'} action={<LimitSelect value={itemsPerPage.bugs} onChange={(e) => setLimit('bugs', e.target.value)} />} />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                  <Field label="Descrição"><input value={newBug.desc} onChange={(e) => setNewBug((c) => ({ ...c, desc: e.target.value }))} placeholder="Descrição do bug" className={inputClass} /></Field>
                  <SelectField label="Status" value={newBug.status} onChange={(e) => setNewBug((c) => ({ ...c, status: e.target.value }))} options={bugStatuses} />
                  <Field label="Frente"><input value={newBug.owner} onChange={(e) => setNewBug((c) => ({ ...c, owner: e.target.value }))} placeholder="Backend, Frontend..." className={inputClass} /></Field>
                  <Field label="Responsável"><input value={newBug.developer} onChange={(e) => setNewBug((c) => ({ ...c, developer: e.target.value }))} placeholder="Desenvolvedor" className={inputClass} /></Field>
                  <SelectField label="Squad" value={newBug.squad} onChange={(e) => setNewBug((c) => ({ ...c, squad: e.target.value }))} options={squads.filter((item) => item !== 'Todos')} />
                </div>
                <div className="mt-4 flex gap-2"><Button onClick={saveBug}>{editingBugId ? 'Salvar' : 'Adicionar'}</Button><Button variant="secondary" onClick={resetBug}>Cancelar</Button></div>
                <div className="mt-5 space-y-3">
                  {filteredBugs.slice(0, itemsPerPage.bugs).map((bug) => <RecordCard key={bug.id} title={bug.desc} status={bug.status} meta={`${bug.id} • ${bug.owner} • Responsável: ${bug.developer || '—'} • ${bug.squad}`} onEdit={() => { setEditingBugId(bug.id); setNewBug({ desc: bug.desc, status: bug.status, owner: bug.owner, developer: bug.developer || '', squad: bug.squad }) }} onDelete={() => deleteEntity('bugs', bug.id, setBugs, resetBug)} />)}
                  {!filteredBugs.length && <EmptyState>Nenhum bug encontrado.</EmptyState>}
                </div>
              </Card>
            )}

            {activeTab === 'Configuração' && ['projects', 'squads', 'types', 'status'].includes(configurationTab) && (
              <Card>
                <div className="grid grid-cols-1 gap-6">
                {['projects', 'squads'].includes(configurationTab) && <div className="min-w-0">
                  {catalogTab === 'projects' ? (
                    <>
                      {editingConfig.type === 'project' && <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          value={configForm.project}
                          onChange={(event) => setConfigForm((current) => ({ ...current, project: event.target.value }))}
                          placeholder="Nome do projeto"
                          className={inputClass}
                        />
                        <select
                          value={configForm.projectSquad}
                          onChange={(event) => setConfigForm((current) => ({ ...current, projectSquad: event.target.value }))}
                          className={inputClass}
                        >
                          {configData.squads.map((squad) => <option key={squad} value={squad}>{squad}</option>)}
                        </select>
                        <div className="flex gap-2">
                          {editingConfig.type === 'project' && <Button variant="secondary" onClick={resetConfigEditor}>Cancelar</Button>}
                        </div>
                      </div>}

                      <div className="mt-4 space-y-2">
                        {configData.projects.map((project) => (
                          <div key={project} className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text)]">{project}</p>
                              <p className="mt-1 text-xs text-[var(--muted)]">Squad: {projectSquads[project] || 'Não associada'}</p>
                            </div>
                            <div className="flex shrink-0 gap-2 opacity-80 transition group-hover:opacity-100">
                              <Button
                                variant="secondary"
                                className="px-3 py-1.5 text-xs"
                                onClick={() => {
                                  setEditingConfig({ type: 'project', value: project })
                                  setConfigAddTarget('project')
                                  setConfigForm((current) => ({
                                    ...current,
                                    project,
                                    projectSquad: projectSquads[project] || configData.squads[0] || '',
                                  }))
                                }}
                              >
                                Editar
                              </Button>
                              <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteProject(project)}>Excluir</Button>
                            </div>
                          </div>
                        ))}
                        {!configData.projects.length && <EmptyState>Nenhum projeto configurado.</EmptyState>}
                      </div>
                    </>
                  ) : (
                    <>
                      {editingConfig.type === 'squad' && <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={configForm.squad}
                          onChange={(event) => setConfigForm((current) => ({ ...current, squad: event.target.value }))}
                          placeholder="Nome da squad"
                          className={inputClass}
                        />
                        {editingConfig.type === 'squad' && <Button variant="secondary" onClick={resetConfigEditor}>Cancelar</Button>}
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
                      placeholder={workflowConfig.placeholder}
                      className={inputClass}
                    />
                    {editingConfig.type === workflowConfig.type && <Button variant="secondary" onClick={resetConfigEditor}>Cancelar</Button>}
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="font-semibold">{language === 'pt-BR' ? 'Idioma' : 'Language'}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{language === 'pt-BR' ? 'Escolha o idioma da interface.' : 'Choose the interface language.'}</p>
                    <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[var(--text)]">
                      <span className="text-sm font-semibold text-[var(--muted)]">{language === 'pt-BR' ? 'Idioma da interface' : 'Interface language'}</span>
                      <select value={language} onChange={(event) => setLanguage(event.target.value)} className={inputClass}>
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">English (United States)</option>
                      </select>
                    </label>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="font-semibold">{language === 'pt-BR' ? 'Aparência' : 'Appearance'}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{language === 'pt-BR' ? 'Altere o tema visual da aplicação.' : 'Change the application theme.'}</p>
                    <Button className="mt-4" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? (language === 'pt-BR' ? 'Usar modo claro' : 'Use light mode') : (language === 'pt-BR' ? 'Usar modo noturno' : 'Use dark mode')}</Button>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="font-semibold">{language === 'pt-BR' ? 'Barra lateral' : 'Sidebar'}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{language === 'pt-BR' ? 'Escolha entre o menu completo ou compacto.' : 'Choose between the full or compact menu.'}</p>
                    <Button className="mt-4" onClick={() => setSidebarCollapsed((current) => !current)}>{sidebarCollapsed ? (language === 'pt-BR' ? 'Expandir barra lateral' : 'Expand sidebar') : (language === 'pt-BR' ? 'Recolher barra lateral' : 'Collapse sidebar')}</Button>
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
          className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[var(--modal)] p-6 text-[var(--text)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        >
          <form onSubmit={(event) => { event.preventDefault(); saveEn() }}>
            <h3 id="task-dialog-title" className="text-xl font-semibold">{editingEnId ? 'Editar tarefa' : 'Adicionar Tarefa'}</h3>
            <fieldset disabled={savingTask} className="mt-5 grid min-w-0 grid-cols-1 gap-4 border-0 p-0 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Descrição Tarefa">
                  <textarea autoFocus required rows={3} value={newEn.desc} onChange={(event) => setNewEn((current) => ({ ...current, desc: event.target.value }))} placeholder="Ex: Validar fluxo de contratação digital" className={inputClass} />
                </Field>
              </div>
              <SelectField label="Tipo de tarefa" value={newEn.type} onChange={(event) => setNewEn((current) => ({ ...current, type: event.target.value }))} options={configData.taskTypes.length ? configData.taskTypes : taskTypes} />
              <SelectField label="Projeto" value={newEn.project} onChange={(event) => {
                const project = event.target.value
                setNewEn((current) => ({ ...current, project, squad: projectSquads[project] || current.squad }))
              }} options={projects.filter((item) => item !== 'Todos')} />
              <SelectField label="Squad" value={newEn.squad} onChange={(event) => setNewEn((current) => ({ ...current, squad: event.target.value }))} options={squads.filter((item) => item !== 'Todos')} />
              <SelectField label="Responsável QA" value={newEn.owner} onChange={(event) => setNewEn((current) => ({ ...current, owner: event.target.value }))} options={qas.filter((item) => item !== 'Todos')} />
              {editingEnId && <SelectField label="Status" value={newEn.status} onChange={(event) => setNewEn((current) => ({ ...current, status: event.target.value }))} options={taskStatuses} />}
            </fieldset>
            {taskError && <p role="alert" className="mt-4 text-sm text-[var(--red)]">{taskError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" disabled={savingTask} onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={!canSaveTask || savingTask}>{savingTask ? 'Salvando...' : editingEnId ? 'Salvar alterações' : 'Salvar tarefa'}</Button>
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
            className="w-full max-w-md rounded-[24px] border border-[var(--border)] bg-[var(--modal)] p-6 text-[var(--text)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--red)]">Excluir tarefa</p>
            <h3 id="delete-task-title" className="mt-2 text-xl font-semibold">Confirmar exclusão?</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              A tarefa {pendingDeleteTask.id} será removida permanentemente. Essa ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingDeleteTask(null)}>Cancelar</Button>
              <Button variant="danger" onClick={deleteTask}>Excluir tarefa</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
