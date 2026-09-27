import { useRef, useState } from 'react'
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'
import { saveRecord } from '../domain/records'
import { scenarioStatuses, normalizeStatus, validBinding, validateScenario } from '../domain/testing'
import useRecords, { saveLocalRecords } from '../hooks/useRecords'
import { Button, Card, EmptyState, Field, inputClass, SectionTitle, SelectField } from './ui'

export default function Scenarios({ owner, params = {}, navigate }) {
  const projects = useRecords('projects'), flows = useRecords('flows')
  const [selected, setSelected] = useState([])
  const [targetFlow, setTargetFlow] = useState('')
  const defaults = (item = {}) => ({ title: item.title || '', description: item.description || '', projectId: item.projectId || params.projectId || '', flowId: item.flowId || params.flowId || '', status: normalizeStatus(item.status || 'Pendente'), scriptFile: item.scriptFile || '', executedAt: item.executedAt || '', notes: item.notes || '', exclusionReason: item.exclusionReason || '' })
  const scenarios = useRecords('scenarios')
  const impacts = useRecords('impacts')
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [selection, setSelection] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  const remote = hasFirebaseConfig && db
  const run = async (action, message) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try { await action(); setNotice(message) }
    catch (e) { setError(e.message || 'Unable to save. Check your connection and access permissions.') }
    finally { lock.current = false; setBusy(false) }
  }
  const save = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    run(async () => {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim() }
      validateScenario(payload, projects.records, flows.records)
      await saveRecord('scenarios', editingId, payload, owner)
      setForm(null)
      setEditingId(null)
    }, 'Scenario saved successfully.')
  }
  const link = (impact, scenarioId) => run(async () => {
    const payload = { scenarioId, updatedAt: remote ? serverTimestamp() : new Date().toISOString(), updatedBy: owner }
    if (remote) await updateDoc(doc(db, 'impacts', impact.id), payload)
    else saveLocalRecords('impacts', impacts.records.map((item) => item.id === impact.id ? { ...item, ...payload } : item))
    setSelection({})
  }, scenarioId ? 'Impact linked to scenario.' : 'Link removed. The impact was preserved.')
  const invalidRoute = (params.projectId && !projects.records.some((p) => p.id === params.projectId)) || (params.flowId && !flows.records.some((f) => f.id === params.flowId && f.projectId === params.projectId)) || (params.status && !scenarioStatuses.includes(params.status))
  const loading = scenarios.loading || projects.loading || flows.loading
  const visible = scenarios.records.filter((item) => !invalidRoute && (!params.projectId || item.projectId === params.projectId) && (!params.flowId || item.flowId === params.flowId) && (!params.status || normalizeStatus(item.status) === params.status) && (params.unassigned !== '1' || !validBinding(item, projects.records, flows.records)))
  const associate = () => run(async () => {
    const flow = flows.records.find((f) => f.id === targetFlow)
    if (!flow || !projects.records.some((p) => p.id === flow.projectId)) throw new Error('Select a valid flow.')
    const ids = selected.filter((id) => visible.some((s) => s.id === id))
    for (const id of ids) {
      const item = scenarios.records.find((s) => s.id === id)
      const payload = { ...defaults(item), projectId: flow.projectId, flowId: flow.id }
      validateScenario(payload, projects.records, flows.records)
      await saveRecord('scenarios', id, payload, owner)
      setSelected((current) => current.filter((value) => value !== id))
    }
  }, 'Scenarios linked. Impact links were preserved.')
  const removeSelected = () => {
    const ids = selected.filter((id) => visible.some((scenario) => scenario.id === id))
    if (!ids.length || !window.confirm(`Delete ${ids.length} selected scenario(s)? This action cannot be undone.`)) return
    run(async () => {
      if (remote) {
        for (const id of ids) await deleteDoc(doc(db, 'scenarios', id))
      } else {
        saveLocalRecords('scenarios', scenarios.records.filter((scenario) => !ids.includes(scenario.id)))
      }
      setSelected([])
    }, `${ids.length} scenario(s) deleted.`)
  }
  const available = impacts.records.filter((item) => !item.scenarioId)
  const loadError = scenarios.error || impacts.error || projects.error || flows.error

  return <section className="space-y-4">
    {(error || loadError) && <p role="alert" className="rounded-2xl bg-[var(--red-soft)] p-4 text-[var(--red)]">{error || loadError}</p>}
    {notice && <p role="status" className="rounded-2xl bg-[var(--green-soft)] p-4 text-[var(--green)]">{notice}</p>}
    <Card>
      <SectionTitle title="Scenarios" action={<div className="flex flex-wrap gap-2"><Button disabled={busy || loading || Boolean(loadError)} onClick={() => { setEditingId(null); setForm(defaults()) }}>Add scenario</Button><Button variant="danger" disabled={busy || loading || Boolean(loadError) || !selected.some((id) => visible.some((scenario) => scenario.id === id))} onClick={removeSelected}>Delete selected</Button></div>} />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SelectField label="Filter project" value={params.projectId || ''} options={[{ value: '', label: 'All projects' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => { setSelected([]); navigate('Cenários', { projectId: e.target.value }) }} />
        <SelectField label="Filter flow" value={params.flowId || ''} options={[{ value: '', label: 'All flows' }, ...flows.records.filter((f) => f.projectId === params.projectId).map((f) => ({ value: f.id, label: f.name }))]} onChange={(e) => { setSelected([]); navigate('Cenários', { ...params, flowId: e.target.value }) }} />
        <SelectField label="Filter status" value={params.status || ''} options={[{ value: '', label: 'All statuses' }, ...scenarioStatuses]} onChange={(e) => { setSelected([]); navigate('Cenários', { ...params, status: e.target.value }) }} />
      </div>
      {params.unassigned === '1' && <p>Showing scenarios that need to be linked to a flow.</p>}
      {!loading && invalidRoute && <p role="alert">Invalid filter or flow does not belong to the project.</p>}
      {form && <form onSubmit={save} className="mb-4 rounded-2xl border border-[var(--border)] p-4">
        <h4 className="mb-3 font-semibold">{editingId ? 'Edit scenario' : 'New scenario'}</h4>
        <fieldset disabled={busy || loading || Boolean(loadError)} className="space-y-4">
          <Field label="Scenario name"><input autoFocus required maxLength={200} className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Scenario description (optional)"><textarea rows={3} maxLength={2000} className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <SelectField label="Scenario project" value={form.projectId} options={[{ value: '', label: 'Select' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => setForm({ ...form, projectId: e.target.value, flowId: '' })} />
          <SelectField label="Scenario flow" value={form.flowId} options={[{ value: '', label: 'Select' }, ...flows.records.filter((f) => f.projectId === form.projectId).map((f) => ({ value: f.id, label: f.name }))]} onChange={(e) => setForm({ ...form, flowId: e.target.value })} />
          <SelectField label="Execution status" value={form.status} options={scenarioStatuses} onChange={(e) => setForm({ ...form, status: e.target.value, executedAt: ['Aprovado', 'Falhado'].includes(e.target.value) ? form.executedAt || new Date().toISOString().slice(0, 10) : '', exclusionReason: e.target.value === 'Excluído' ? form.exclusionReason : '' })} />
          <Field label="Script/file"><input maxLength={300} className={inputClass} value={form.scriptFile} onChange={(e) => setForm({ ...form, scriptFile: e.target.value })} /></Field>
          {['Aprovado', 'Falhado'].includes(form.status) && <Field label="Execution date"><input required type="date" className={inputClass} value={form.executedAt} onChange={(e) => setForm({ ...form, executedAt: e.target.value })} /></Field>}
          {form.status === 'Excluído' && <Field label="Exclusion reason"><textarea required maxLength={1000} className={inputClass} value={form.exclusionReason} onChange={(e) => setForm({ ...form, exclusionReason: e.target.value })} /></Field>}
          <Field label="Notes"><textarea maxLength={2000} className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !form.title.trim()}>{busy ? 'Saving…' : 'Save scenario'}</Button><Button variant="secondary" onClick={() => { setForm(null); setEditingId(null) }}>Cancel</Button></div>
        </fieldset>
      </form>}
      {selected.some((id) => visible.some((s) => s.id === id)) && <div className="my-4 space-y-3 rounded-2xl border border-[var(--border)] p-4"><p>Associar cenários selecionados ao fluxo:</p><SelectField label="Fluxo de destino" value={targetFlow} onChange={(e) => setTargetFlow(e.target.value)} options={[{ value: '', label: 'Selecione projeto / fluxo' }, ...flows.records.map((f) => ({ value: f.id, label: `${projects.records.find((p) => p.id === f.projectId)?.name || 'Projeto indisponível'} / ${f.name}` }))]} /><Button disabled={busy || loading || Boolean(loadError) || !targetFlow} onClick={associate}>Associar selecionados</Button></div>}
      <div className="mt-4 space-y-4">
        {loading && <p role="status">Carregando cenários…</p>}
        {!loading && !visible.length && <EmptyState>{scenarios.records.length ? 'Nenhum cenário encontrado.' : 'Nenhum cenário cadastrado. Adicione o primeiro para vincular impactos.'}</EmptyState>}
        {!loading && !loadError && visible.map((scenario) => {
          const linked = impacts.records.filter((item) => item.scenarioId === scenario.id)
          return <article key={scenario.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="flex items-start justify-between gap-3"><h4 className="break-words font-semibold">{scenario.title}</h4><Button variant="secondary" disabled={busy} onClick={() => { setEditingId(scenario.id); setForm(defaults(scenario)) }}>Editar cenário</Button></div>
            <label className="my-3 flex gap-2"><input type="checkbox" checked={selected.includes(scenario.id)} disabled={busy} onChange={(e) => setSelected((current) => e.target.checked ? [...current, scenario.id] : current.filter((id) => id !== scenario.id))} />Selecionar {scenario.title} para associação</label>
            <p className="text-sm">{validBinding(scenario, projects.records, flows.records) ? `${projects.records.find((p) => p.id === scenario.projectId).name} / ${flows.records.find((f) => f.id === scenario.flowId).name}` : 'Sem associação válida'} · {normalizeStatus(scenario.status)}</p>
            <p className="text-xs text-[var(--muted)]">{scenario.scriptFile || 'Sem script'} · Execução: {scenario.executedAt || '—'}</p>
            {scenario.notes && <p className="whitespace-pre-wrap text-sm">Observações: {scenario.notes}</p>}
            {scenario.exclusionReason && <p className="text-sm">Exclusão: {scenario.exclusionReason}</p>}
            {scenario.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--muted)]">{scenario.description}</p>}
            <h5 className="mt-4 font-semibold">Impactos associados ({linked.length})</h5>
            {impacts.loading ? <p role="status">Carregando impactos…</p> : !impacts.error && !linked.length && <p className="mt-2 text-sm text-[var(--muted)]">Nenhum impacto associado a este cenário.</p>}
            {linked.map((impact) => <div key={impact.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{impact.desc}</p><p className="mt-1 text-xs text-[var(--muted)]">{impact.severity} · {impact.status} · {impact.owner}</p></div><Button variant="secondary" disabled={busy || Boolean(impacts.error)} onClick={() => link(impact, '')}>Desvincular</Button></div>)}
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1"><SelectField label={`Associar impacto a ${scenario.title}`} value={selection[scenario.id] || ''} onChange={(event) => setSelection({ ...selection, [scenario.id]: event.target.value })} options={[{ value: '', label: 'Selecione um impacto sem cenário' }, ...available.map((item) => ({ value: item.id, label: item.desc }))]} /></div>
              <Button disabled={busy || impacts.loading || Boolean(loadError) || !available.some((item) => item.id === selection[scenario.id])} onClick={() => link(available.find((item) => item.id === selection[scenario.id]), scenario.id)}>Associar impacto</Button>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">Para trocar o cenário de um impacto já associado, edite-o na aba Impactos.</p>
          </article>
        })}
      </div>
    </Card>
  </section>
}
