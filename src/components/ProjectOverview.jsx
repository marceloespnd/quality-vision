import { useRef, useState } from 'react'
import useRecords from '../hooks/useRecords'
import { saveRecord } from '../domain/records'
import { projectSummary, validBinding } from '../domain/testing'
import { Button, Card, EmptyState, Field, inputClass, SelectField, StatCard } from './ui'

function FlowSection({ summary, project, navigate }) {
  const visible = summary.flows
  const total = visible.reduce((counts, flow) => ({
    total: counts.total + flow.summary.total,
    approved: counts.approved + flow.summary.approved,
    failed: counts.failed + flow.summary.failed,
    excluded: counts.excluded + flow.summary.excluded,
    pending: counts.pending + flow.summary.pending,
  }), { total: 0, approved: 0, failed: 0, excluded: 0, pending: 0 })
  const statusLink = (flow, key, label) => <button type="button" className="font-semibold underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]" aria-label={`${flow.name}: ${flow.summary[key]} ${label}`} onClick={() => navigate('Cenários', { projectId: project.id, flowId: flow.id, status: label })}>{flow.summary[key]}</button>

  return <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm" aria-label={`Módulos do projeto ${project.name}`}>
        <caption className="sr-only">Indicadores de cenários por módulo do projeto {project.name}</caption>
        <thead className="bg-[var(--sidebar)] text-xs uppercase tracking-wide text-white">
          <tr>
            <th scope="col" className="sticky left-0 z-[1] bg-[var(--sidebar)] px-2 py-2 font-semibold">Module</th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">Scenarios</th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">Passed</th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">Failed</th>
            <th scope="col" className="px-2 py-2 text-center font-semibold">Excluded</th>
            <th scope="col" className="bg-[var(--orange-soft)] px-2 py-2 text-center font-semibold text-[var(--text)]">Pending</th>
            <th scope="col" className="px-2 py-2 font-semibold">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {visible.map((flow) => <tr key={flow.id} className="bg-[var(--surface)] hover:bg-[var(--hover)]">
            <th scope="row" className="sticky left-0 z-[1] bg-[var(--surface)] px-2 py-2 text-left font-normal">
              <a className="min-w-0 truncate font-semibold hover:text-[var(--accent)]" href={`/cenarios?projectId=${encodeURIComponent(project.id)}&flowId=${encodeURIComponent(flow.id)}`} onClick={(e) => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); navigate('Cenários', { projectId: project.id, flowId: flow.id }) } }}>{flow.name}</a>
            </th>
            <td className="px-2 py-2 text-center font-semibold">{flow.summary.total}</td>
            <td className="px-2 py-2 text-center">{statusLink(flow, 'approved', 'Aprovado')}</td>
            <td className="px-2 py-2 text-center">{statusLink(flow, 'failed', 'Falhado')}</td>
            <td className="px-2 py-2 text-center">{statusLink(flow, 'excluded', 'Excluído')}</td>
            <td className="bg-[var(--orange-soft)] px-2 py-2 text-center text-[var(--text)]">{statusLink(flow, 'pending', 'Pendente')}</td>
            <td className="px-2 py-2 text-xs text-[var(--muted)]">{flow.owner}</td>
          </tr>)}
        </tbody>
        {visible.length > 0 && <tfoot className="border-t-2 border-[var(--border)] bg-[var(--sidebar)] font-semibold text-white">
          <tr>
            <th scope="row" className="sticky left-0 z-[1] bg-[var(--sidebar)] px-2 py-2 text-left">TOTAL</th>
            <td className="px-2 py-2 text-center">{total.total}</td>
            <td className="px-2 py-2 text-center">{total.approved}</td>
            <td className="px-2 py-2 text-center">{total.failed}</td>
            <td className="px-2 py-2 text-center">{total.excluded}</td>
            <td className="bg-[var(--orange-soft)] px-2 py-2 text-center text-[var(--text)]">{total.pending}</td>
            <td className="px-2 py-2" />
          </tr>
        </tfoot>}
      </table>
      {!visible.length && <EmptyState>{summary.flows.length ? 'No flows match the current filters.' : 'This project has no flows yet.'}</EmptyState>}
    </div>
}

export default function ProjectOverview({ owner, params, navigate, legacyProjects = [] }) {
  const projects = useRecords('projects'), flows = useRecords('flows'), scenarios = useRecords('scenarios')
  const [form, setForm] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const loading = projects.loading || flows.loading || scenarios.loading
  const loadError = projects.error || flows.error || scenarios.error
  const project = projects.records.find((p) => p.id === params.projectId)
  const summary = projectSummary(project?.id, flows.records, scenarios.records)
  const unassigned = scenarios.records.filter((s) => !validBinding(s, projects.records, flows.records)).length
  const save = async (event) => {
    event.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const name = form.name.trim(), responsibleOwner = form.owner.trim()
      if (!name || !responsibleOwner) throw new Error('Enter a name and owner.')
      if (form.kind === 'flows' && !project) throw new Error('Select a valid project.')
      const records = form.kind === 'projects' ? projects.records : flows.records.filter((f) => f.projectId === project.id)
      if (records.some((r) => r.id !== form.id && r.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('An item with this name already exists.')
      const id = await saveRecord(form.kind, form.id, { name, owner: responsibleOwner, ...(form.kind === 'flows' ? { projectId: project.id } : {}) }, owner)
      if (form.kind === 'projects') navigate('Visão do Projeto', { projectId: id })
      setForm(null)
    } catch (e) { setError(e.message) } finally { lock.current = false; setBusy(false) }
  }
  return <section className="space-y-3">
    {(error || loadError) && <p role="alert">{error || loadError}</p>}
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">{project?.name || 'Select a project'}</p>
          {project && <p className="mt-1 text-sm text-[var(--muted)]">Owner: {project.owner} · Status: {summary.situation}</p>}
        </div>
        <div className="w-full sm:max-w-xs">
          <SelectField label="Project" value={params.projectId || ''} options={[{ value: '', label: 'Select a project' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => { setForm(null); navigate('Visão do Projeto', { projectId: e.target.value }) }} />
        </div>
      </div>
      {form && <form onSubmit={save} className="mt-3"><fieldset disabled={busy} className="space-y-3"><h4>{form.id ? 'Edit' : 'Create'} {form.kind === 'projects' ? 'project' : 'flow'}</h4>
        <Field label="Name"><input autoFocus required maxLength={120} list={form.kind === 'projects' ? 'legacy-projects' : undefined} className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <datalist id="legacy-projects">{legacyProjects.map((name) => <option key={name} value={name} />)}</datalist>
        <Field label="Owner"><input required maxLength={80} className={inputClass} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
        <div className="flex gap-2"><Button type="submit">{busy ? 'Saving…' : 'Save'}</Button><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button></div>
      </fieldset></form>}
      {loading ? <p role="status" className="mt-3">Loading project…</p> : !loadError && <>
      {unassigned > 0 && <div className="mt-3 rounded-2xl border border-[var(--orange)] bg-[var(--orange-soft)] p-3"><p>{unassigned} scenario(s) need a valid project and flow link. They are excluded from metrics.</p><Button variant="secondary" className="mt-2" onClick={() => navigate('Cenários', { unassigned: '1' })}>Link existing scenarios</Button></div>}
      {!project ? <EmptyState>{params.projectId ? 'Project not found. Select another project.' : 'Select a project to track tests.'}</EmptyState> : <>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">{[
          ['Total', 'total', 'bg-[var(--surface-muted)]'],
          ['Passed', 'approved', 'bg-[var(--green-soft)]'],
          ['Failed', 'failed', 'bg-[var(--red-soft)]'],
          ['Excluded', 'excluded', 'bg-[var(--gray-soft)]'],
          ['Pending', 'pending', 'bg-[var(--orange-soft)]'],
        ].map(([label, key, className]) => <StatCard compact key={key} title={label} value={summary[key]} className={className} />)}</div>
        <FlowSection summary={summary} project={project} navigate={navigate} />
      </>}
    </>}
    </Card>
  </section>
}
