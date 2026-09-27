import { useEffect, useRef, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'
import useRecords from '../hooks/useRecords'
import { Button, Card, EmptyState, Field, inputClass, SectionTitle, SelectField, StatCard } from './ui'

const statuses = ['Aberto', 'Em tratamento', 'Resolvido']
const severities = ['Baixa', 'Média', 'Alta', 'Crítica']
const storageKey = 'quality-vision-impacts'
const remote = hasFirebaseConfig && db
const emptyForm = (owner) => ({ desc: '', owner, severity: 'Média', status: 'Aberto', taskId: '', scenarioId: '', action: '' })

export default function Impacts({ tasks, owner }) {
  const scenarios = useRecords('scenarios')
  const [impacts, setImpacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todos')
  const [severity, setSeverity] = useState('Todas')
  const editorRef = useRef(null)

  useEffect(() => {
    if (remote) return onSnapshot(collection(db, 'impacts'), (snapshot) => {
      setImpacts(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })))
      setLoading(false)
      setError('')
    }, () => {
      setError('Unable to load impacts. Check your connection and access permissions.')
      setLoading(false)
    })
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (!Array.isArray(saved) || saved.some((item) => !item || typeof item.id !== 'string' || typeof item.desc !== 'string')) throw new Error('Invalid data')
      setImpacts(saved)
    } catch {
      setError('Unable to read impacts saved in this browser.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (form) editorRef.current?.focus()
  }, [editingId, Boolean(form)])

  const persistLocal = (next) => {
    localStorage.setItem(storageKey, JSON.stringify(next))
    setImpacts(next)
  }

  const save = async (event) => {
    event.preventDefault()
    if (lock.current || !form.desc.trim() || !form.owner.trim()) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const now = remote ? serverTimestamp() : new Date().toISOString()
      const payload = { ...form, desc: form.desc.trim(), owner: form.owner.trim(), action: form.action.trim(), updatedAt: now, updatedBy: owner }
      const id = editingId || `IMP-${crypto.randomUUID()}`
      if (remote) {
        if (editingId) await updateDoc(doc(db, 'impacts', id), payload)
        else await setDoc(doc(db, 'impacts', id), { ...payload, createdAt: now, createdBy: owner })
      } else {
        persistLocal(editingId ? impacts.map((item) => item.id === id ? { ...item, ...payload } : item) : [{ ...payload, id, createdAt: now, createdBy: owner }, ...impacts])
      }
      setForm(null)
      setEditingId(null)
      setNotice('Impact saved successfully.')
    } catch {
      setError('Unable to save the impact. Your data was kept in the form. Try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const remove = async () => {
    if (lock.current || !pendingDelete) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (remote) await deleteDoc(doc(db, 'impacts', pendingDelete.id))
      else persistLocal(impacts.filter((item) => item.id !== pendingDelete.id))
      if (editingId === pendingDelete.id) { setForm(null); setEditingId(null) }
      setPendingDelete(null)
      setNotice('Impact deleted successfully.')
    } catch {
      setError('Unable to delete the impact. Check your connection and access permissions.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const visible = impacts.filter((item) => {
    const task = tasks.find((task) => task.id === item.taskId)
    const text = [item.desc, item.owner, item.action, item.taskId, task?.desc, task?.project, scenarios.records.find((scenario) => scenario.id === item.scenarioId)?.title].join(' ').toLocaleLowerCase('pt-BR')
    return (status === 'Todos' || item.status === status) && (severity === 'Todas' || item.severity === severity) && text.includes(search.trim().toLocaleLowerCase('pt-BR'))
  }).sort((a, b) => {
    const time = (value) => value?.toMillis?.() ?? (Date.parse(value) || 0)
    return time(b.createdAt) - time(a.createdAt) || a.id.localeCompare(b.id)
  })
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  return <section className="space-y-4">
    {scenarios.error && <p role="alert" className="text-[var(--red)]">Scenarios: {scenarios.error}</p>}
    {error && <p role="alert" className="rounded-2xl bg-[var(--red-soft)] p-4 text-[var(--red)]">{error}</p>}
    {notice && <p role="status" className="rounded-2xl bg-[var(--green-soft)] p-4 text-[var(--green)]">{notice}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard title="Active impacts" value={impacts.filter((item) => item.status !== 'Resolvido').length} />
      <StatCard title="High or critical severity" value={impacts.filter((item) => item.status !== 'Resolvido' && ['Alta', 'Crítica'].includes(item.severity)).length} sub="Impacts not resolved" />
      <StatCard title="Resolved" value={impacts.filter((item) => item.status === 'Resolvido').length} />
    </div>
    <Card>
      <SectionTitle title="Impact tracking" action={<Button disabled={loading || busy} onClick={() => { setEditingId(null); setForm(emptyForm(owner)); setNotice('') }}>Add impact</Button>} />
      <p className="mb-4 text-sm text-[var(--muted)]">Track blockers and their consequences for delivery. Linking a task does not change its status.</p>
      {form && <form onSubmit={save} className="mb-4 rounded-2xl border border-[var(--border)] p-4">
        <h4 className="mb-4 font-semibold">{editingId ? 'Editar impacto' : 'Novo impacto'}</h4>
        <fieldset disabled={busy} className="space-y-4">
          <Field label="Descrição do impacto"><textarea ref={editorRef} required maxLength={1000} value={form.desc} onChange={change('desc')} className={inputClass} rows={3} /></Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Responsável"><input required maxLength={80} value={form.owner} onChange={change('owner')} className={inputClass} /></Field>
            <SelectField label="Gravidade" value={form.severity} onChange={change('severity')} options={severities} />
            <SelectField label="Status do impacto" value={form.status} onChange={change('status')} options={statuses} />
          </div>
          <SelectField label="Tarefa vinculada (opcional)" value={form.taskId} onChange={change('taskId')} options={[{ value: '', label: 'Sem vínculo' }, ...(!tasks.some((task) => task.id === form.taskId) && form.taskId ? [{ value: form.taskId, label: `${form.taskId} — indisponível` }] : []), ...tasks.map((task) => ({ value: task.id, label: `${task.id} — ${task.desc}` }))]} />
          <Field label="Cenário vinculado (opcional)"><select disabled={scenarios.loading || Boolean(scenarios.error)} className={inputClass} value={form.scenarioId} onChange={change('scenarioId')}>
            <option value="">{scenarios.loading ? 'Carregando cenários…' : 'Sem cenário'}</option>
            {form.scenarioId && !scenarios.records.some((item) => item.id === form.scenarioId) && <option value={form.scenarioId}>{form.scenarioId} — indisponível</option>}
            {scenarios.records.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select></Field>
          {!scenarios.loading && !scenarios.error && !scenarios.records.length && <p className="text-sm text-[var(--muted)]">Cadastre um cenário na aba Cenários para associá-lo a este impacto.</p>}
          <Field label="Plano de ação (opcional)"><textarea maxLength={2000} value={form.action} onChange={change('action')} className={inputClass} rows={3} /></Field>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !form.desc.trim() || !form.owner.trim()}>{busy ? 'Salvando…' : 'Salvar impacto'}</Button><Button variant="secondary" onClick={() => { setForm(null); setEditingId(null) }}>Cancelar</Button></div>
        </fieldset>
      </form>}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Field label="Buscar impactos"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descrição, responsável, tarefa ou cenário" className={inputClass} /></Field>
        <SelectField label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value)} options={['Todos', ...statuses]} />
        <SelectField label="Filtrar por gravidade" value={severity} onChange={(event) => setSeverity(event.target.value)} options={['Todas', ...severities]} />
      </div>
      {pendingDelete && <div role="region" aria-label="Confirmar exclusão" className="mb-4 rounded-2xl border border-[var(--red)] p-4">
        <p className="mb-3">Excluir o impacto “{pendingDelete.desc}”? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2"><Button variant="danger" disabled={busy} onClick={remove}>{busy ? 'Excluindo…' : 'Confirmar exclusão'}</Button><Button variant="secondary" disabled={busy} onClick={() => setPendingDelete(null)}>Cancelar exclusão</Button></div>
      </div>}
      <div className="space-y-3">
        {loading ? <p role="status">Carregando impactos…</p> : <p className="text-sm text-[var(--muted)]">{visible.length} impacto(s) encontrado(s)</p>}
        {!loading && visible.map((item) => {
          const task = tasks.find((task) => task.id === item.taskId)
          return <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><h4 className="min-w-0 whitespace-pre-wrap break-words font-semibold">{item.desc}</h4><span className="text-sm font-semibold">{item.severity} · {item.status}</span></div>
            <p className="mt-2 text-sm text-[var(--muted)]">Responsável: {item.owner}</p>
            {item.taskId && <p className="mt-2 text-sm text-[var(--muted)]">Tarefa: {task ? `${task.id} — ${task.desc} • ${task.project}` : `${item.taskId} — indisponível`}</p>}
            {item.scenarioId && <p className="mt-2 text-sm text-[var(--muted)]">Cenário: {scenarios.records.find((scenario) => scenario.id === item.scenarioId)?.title || `${item.scenarioId} — indisponível`}</p>}
            {item.action && <p className="mt-3 whitespace-pre-wrap break-words text-sm">Plano de ação: {item.action}</p>}
            <div className="mt-4 flex gap-2"><Button variant="secondary" disabled={busy} onClick={() => { setEditingId(item.id); setForm({ desc: item.desc, owner: item.owner, severity: item.severity, status: item.status, taskId: item.taskId || '', scenarioId: item.scenarioId || '', action: item.action || '' }); setNotice('') }}>Editar</Button><Button variant="danger" disabled={busy} onClick={() => setPendingDelete(item)}>Excluir</Button></div>
          </article>
        })}
        {!loading && !visible.length && <EmptyState>{impacts.length ? 'Nenhum impacto encontrado com os filtros atuais.' : 'Nenhum impacto cadastrado. Adicione o primeiro para acompanhar sua resolução.'}</EmptyState>}
      </div>
    </Card>
  </section>
}
