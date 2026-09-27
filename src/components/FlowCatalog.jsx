import { useEffect, useRef, useState } from 'react'
import useRecords from '../hooks/useRecords'
import { saveRecord } from '../domain/records'
import { Button, Card, EmptyState, Field, inputClass, SelectField } from './ui'

export default function FlowCatalog({ owner, addRequest = 0 }) {
  const projects = useRecords('projects')
  const flows = useRecords('flows')
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const loading = projects.loading || flows.loading
  const loadError = projects.error || flows.error
  const visible = flows.records.filter((flow) => {
    const project = projects.records.find((item) => item.id === flow.projectId)
    return `${flow.name} ${flow.owner} ${project?.name || ''}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))
  })
  const startNewFlow = () => { setError(''); setForm({ id: '', name: '', owner, projectId: projects.records[0]?.id || '' }) }

  useEffect(() => {
    if (addRequest) startNewFlow()
  }, [addRequest])

  const save = async (event) => {
    event.preventDefault()
    if (!form || lock.current) return
    const name = form.name.trim()
    const responsible = form.owner.trim()
    if (!name || !responsible || !form.projectId) return setError('Fill in project, name, and owner.')
    if (flows.records.some((flow) => flow.id !== form.id && flow.projectId === form.projectId && flow.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      return setError('A flow with this name already exists in this project.')
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await saveRecord('flows', form.id, { name, owner: responsible, projectId: form.projectId }, owner)
      setForm(null)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the flow.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      {(error || loadError) && <p role="alert" className="rounded-2xl bg-[var(--red-soft)] p-4 text-[var(--red)]">{error || loadError}</p>}
      <Card>
        {form && <form onSubmit={save} className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField label="Project" value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} options={projects.records.map((project) => ({ value: project.id, label: project.name }))} />
            <Field label="Flow name"><input autoFocus required maxLength={120} className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Owner"><input required maxLength={80} className={inputClass} value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save flow'}</Button><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button></div>
        </form>}
        <Field label="Search flows"><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, project, or owner" /></Field>
        <div className="mt-3 space-y-2">
          {loading && <p role="status">Carregando fluxos…</p>}
          {!loading && visible.map((flow) => <div key={flow.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{flow.name}</p><p className="mt-1 text-xs text-[var(--muted)]">Projeto: {projects.records.find((project) => project.id === flow.projectId)?.name || 'Projeto indisponível'} · Responsável: {flow.owner}</p></div>
            <Button variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={() => { setError(''); setForm({ id: flow.id, name: flow.name, owner: flow.owner, projectId: flow.projectId }) }}>Editar fluxo</Button>
          </div>)}
          {!loading && !visible.length && <EmptyState>{flows.records.length ? 'Nenhum fluxo encontrado.' : 'Nenhum fluxo cadastrado. Crie o primeiro fluxo.'}</EmptyState>}
        </div>
      </Card>
    </section>
  )
}
