import useScenarioExecution from '../hooks/useScenarioExecution'
import { blockersFor, affectsScenario } from '../domain/occurrences'
import { sortScenarios } from '../domain/scenarioSort'
import { useTranslation } from '../i18n'
import { Fragment, useRef, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'
import { saveRecord } from '../domain/records'
import { summarize, scenarioStatuses, normalizeStatus, validBinding, validateScenario } from '../domain/testing'
import useRecords, { saveLocalRecords } from '../hooks/useRecords'
import { Button, Card, EmptyState, Field, inputClass, SectionTitle, SelectField, StatCard, StatusBadge } from './ui'

export default function Scenarios({ owner, params = {}, navigate }) {
  const { t, locale } = useTranslation()

  const projects = useRecords('projects'), flows = useRecords('flows')
  const [sort, setSort] = useState({ key: '', direction: 'asc' })
  const toggleSort = (key) => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  const [selected, setSelected] = useState([])
  const [targetFlow, setTargetFlow] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const editorRef = useRef(null)
  const defaults = (item = {}) => ({ title: item.title || '', description: item.description || '', projectId: item.projectId || params.projectId || '', flowId: item.flowId || params.flowId || '', status: normalizeStatus(item.status === 'Bloqueado' ? 'Pendente' : item.status || 'Pendente'), scriptFile: item.scriptFile || '', executedAt: item.executedAt || '', notes: item.notes || '', exclusionReason: item.exclusionReason || '' })
  const scenarios = useScenarioExecution()
  const bugs = useRecords('bugs')
  const impacts = useRecords('impacts')
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
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
  const backToList = () => {
    setForm(null)
    setEditingId(null)
    setError('')
    requestAnimationFrame(() => document.getElementById('add-scenario-button')?.focus())
  }
  const save = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    run(async () => {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim() }
      if (['Aprovado', 'Falhado'].includes(payload.status) && blockersFor({ ...payload, id: editingId }, bugs.records, impacts.records).length) throw new Error('Resolve blocking causes before recording execution.')
      validateScenario(payload, projects.records, flows.records)
      await saveRecord('scenarios', editingId, payload, owner)
      backToList()
    }, 'Scenario saved successfully.')
  }
  const invalidRoute = (params.projectId && !projects.records.some((p) => p.id === params.projectId)) || (params.flowId && !flows.records.some((f) => f.id === params.flowId && f.projectId === params.projectId)) || (params.status && !scenarioStatuses.includes(params.status))
  const loading = scenarios.loading || projects.loading || flows.loading
  const filtered = scenarios.records.filter((item) => !invalidRoute && (!params.projectId || item.projectId === params.projectId) && (!params.flowId || item.flowId === params.flowId) && (!params.status || normalizeStatus(item.status) === params.status) && (params.unassigned !== '1' || !validBinding(item, projects.records, flows.records)))
  const visible = sortScenarios(filtered, sort, { flows: flows.records, locale, statusLabel: t })
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
    if (!ids.length || !window.confirm(t(`Delete ${ids.length} selected scenario(s)? This action cannot be undone.`))) return
    run(async () => {
      if (remote) {
        for (const id of ids) await deleteDoc(doc(db, 'scenarios', id))
      } else {
        saveLocalRecords('scenarios', scenarios.records.filter((scenario) => !ids.includes(scenario.id)))
      }
      setSelected([])
    }, `${ids.length} scenario(s) deleted.`)
  }
  const summary = summarize(visible)
  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item.id))
  const editScenario = (scenario) => {
    setError('')
    setNotice('')
    setEditingId(scenario.id)
    setForm(defaults(scenario))
    requestAnimationFrame(() => { editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); editorRef.current?.querySelector('input')?.focus({ preventScroll: true }) })
  }
  const displayDate = (value) => {
    if (!value) return '—'
    const date = new Date(`${value}T12:00:00`)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale).format(date)
  }
  const loadError = scenarios.error || impacts.error || projects.error || flows.error

  return <section className="min-w-0 space-y-4">
    {(error || loadError) && <p role="alert" className="rounded-xl bg-[var(--red-soft)] p-4 text-[var(--red)]">{t(error || loadError)}</p>}
    {notice && <p role="status" className="rounded-xl bg-[var(--green-soft)] p-4 text-[var(--green)]">{t(notice)}</p>}
    <Card className="min-w-0">
      {!form && <>
      <SectionTitle action={<div className="flex flex-wrap gap-2"><Button id="add-scenario-button" disabled={busy || loading || Boolean(loadError)} onClick={() => { setNotice(''); setError(''); setEditingId(null); setForm(defaults()) }}>{t("Add scenario")}</Button><Button variant="danger" disabled={busy || loading || Boolean(loadError) || !selected.some((id) => visible.some((scenario) => scenario.id === id))} onClick={removeSelected}>{t("Delete selected")}</Button></div>} />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SelectField label={t("Filter project")} value={params.projectId || ''} options={[{ value: '', label: 'All projects' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => { setSelected([]); navigate('Cenários', { projectId: e.target.value }) }} />
        <SelectField label={t("Filter flow")} value={params.flowId || ''} options={[{ value: '', label: 'All flows' }, ...flows.records.filter((f) => f.projectId === params.projectId).map((f) => ({ value: f.id, label: f.name }))]} onChange={(e) => { setSelected([]); navigate('Cenários', { ...params, flowId: e.target.value }) }} />
        <SelectField label={t("Filter status")} value={params.status || ''} options={[{ value: '', label: 'All statuses' }, ...scenarioStatuses]} onChange={(e) => { setSelected([]); navigate('Cenários', { ...params, status: e.target.value }) }} />
      </div>
      {params.unassigned === '1' && <p>{t("Showing scenarios that need to be linked to a flow.")}</p>}
      {!loading && invalidRoute && <p role="alert">{t("Invalid filter or flow does not belong to the project.")}</p>}
      </>}
      {form && <Button variant="secondary" disabled={busy} className="mb-4" onClick={backToList}>{t("Back to scenarios")}</Button>}
      {form && <form ref={editorRef} onSubmit={save} className="mb-4 rounded-xl border border-[var(--border)] p-4">
        <h4 className="mb-3 font-semibold">{t(editingId ? 'Edit scenario' : 'New scenario')}</h4>
        <fieldset disabled={busy || loading || Boolean(loadError)} className="space-y-4">
          <Field label={t("Scenario name")}><input autoFocus required maxLength={200} className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label={t("Scenario description (optional)")}><textarea rows={3} maxLength={2000} className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <SelectField label={t("Scenario project")} value={form.projectId} options={[{ value: '', label: 'Select' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => setForm({ ...form, projectId: e.target.value, flowId: '' })} />
          <SelectField label={t("Scenario flow")} value={form.flowId} options={[{ value: '', label: 'Select' }, ...flows.records.filter((f) => f.projectId === form.projectId).map((f) => ({ value: f.id, label: f.name }))]} onChange={(e) => setForm({ ...form, flowId: e.target.value })} />
          <SelectField label={t("Execution status")} value={form.status} options={scenarioStatuses.filter(status => status !== 'Bloqueado')} onChange={(e) => setForm({ ...form, status: e.target.value, executedAt: ['Aprovado', 'Falhado'].includes(e.target.value) ? form.executedAt || new Date().toISOString().slice(0, 10) : '', exclusionReason: e.target.value === 'Excluído' ? form.exclusionReason : '' })} />
          <Field label={t("Script/file")}><input maxLength={300} className={inputClass} value={form.scriptFile} onChange={(e) => setForm({ ...form, scriptFile: e.target.value })} /></Field>
          {['Aprovado', 'Falhado'].includes(form.status) && <Field label={t("Execution date")}><input required type="date" className={inputClass} value={form.executedAt} onChange={(e) => setForm({ ...form, executedAt: e.target.value })} /></Field>}
          {form.status === 'Excluído' && <Field label={t("Exclusion reason")}><textarea required maxLength={1000} className={inputClass} value={form.exclusionReason} onChange={(e) => setForm({ ...form, exclusionReason: e.target.value })} /></Field>}
          <Field label={t("Notes")}><textarea maxLength={2000} className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !form.title.trim()}>{t(busy ? 'Saving…' : 'Save scenario')}</Button><Button variant="secondary" onClick={backToList}>{t("Cancel")}</Button></div>
        </fieldset>
      </form>}
      {!form && <>
      {selected.some((id) => visible.some((s) => s.id === id)) && <div className="my-4 space-y-3 rounded-xl border border-[var(--border)] p-4"><p>{t("Associar cenários selecionados ao fluxo: ")}</p><SelectField label={t("Fluxo de destino")} value={targetFlow} onChange={(e) => setTargetFlow(e.target.value)} options={[{ value: '', label: 'Selecione projeto / fluxo' }, ...flows.records.map((f) => ({ value: f.id, label: `${projects.records.find((p) => p.id === f.projectId)?.name || 'Projeto indisponível'} / ${f.name}` }))]} /><Button variant="secondary" disabled={busy || loading || Boolean(loadError) || !targetFlow} onClick={associate}>{t("Associar selecionados")}</Button></div>}
      {loading && <p role="status">{t('Loading scenarios…')}</p>}
      {!loading && !loadError && <>
        <div className="my-3 grid grid-cols-2 gap-2 lg:grid-cols-6">
          {[['Total', 'total', ''], ['Passed', 'approved', 'bg-[var(--green-soft)]'], ['Failed', 'failed', 'bg-[var(--red-soft)]'], ['Excluded', 'excluded', 'bg-[var(--gray-soft)]'], ['Pending', 'pending', 'bg-[var(--orange-soft)]'], ['Blocked', 'blocked', 'bg-[var(--red-soft)]']].map(([label, key, color]) => <StatCard compact key={key} title={t(label)} value={summary[key]} className={color} />)}
        </div>
        <p className="mb-2 text-xs text-[var(--muted)]">{t('Totals reflect the current filters.')}</p>
        <div className="max-h-[65vh] overflow-auto rounded-xl border border-[var(--border)]">
          <table className="ds-table w-full min-w-[1000px] border-collapse text-left text-sm">
            <caption className="sr-only">{t('Scenario execution overview')}</caption>
            <thead className="sticky top-0 z-10 bg-[var(--sidebar)] text-xs uppercase tracking-wide text-white">
              <tr>
                <th scope="col" className="w-10 px-3 py-2"><input type="checkbox" aria-label={t('Select all visible scenarios')} checked={allSelected} ref={(node) => { if (node) node.indeterminate = !allSelected && visible.some((item) => selected.includes(item.id)) }} disabled={busy || !visible.length} onChange={(event) => setSelected(event.target.checked ? visible.map((item) => item.id) : [])} /></th>
                {[['Flow / directory', 'flow'], ['Script/file', 'script'], ['Execution date', 'date'], ['Execution status', 'status']].map(([label, key]) => <th scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 font-semibold" key={key}>
                  <button type="button" className="inline-flex min-h-11 items-center gap-2 text-left font-semibold uppercase" onClick={() => toggleSort(key)} aria-label={`${t(label)}: ${t(sort.key === key && sort.direction === 'asc' ? 'Sort descending' : 'Sort ascending')}`}>
                    {t(label)}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>)}
                {['Notes', 'Impediments', 'Actions'].map(label => <th scope="col" className="px-3 py-2 font-semibold" key={label}>{t(label)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visible.map((scenario) => {
                const linked = impacts.records.filter(item => affectsScenario(item, scenario))
                const status = normalizeStatus(scenario.status)
                const flow = flows.records.find((item) => item.id === scenario.flowId)
                return <Fragment key={scenario.id}>
                  <tr aria-selected={selected.includes(scenario.id)} className="bg-[var(--surface)] hover:bg-[var(--hover)]">
                    <td className="px-3 py-2"><input type="checkbox" aria-label={`${t('Select')} ${scenario.title}`} checked={selected.includes(scenario.id)} disabled={busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, scenario.id] : current.filter((id) => id !== scenario.id))} /></td>
                    <td className="px-3 py-2"><p className="font-medium">{flow?.name || t('No valid link')}</p>{!params.projectId && <p className="text-xs text-[var(--muted)]">{projects.records.find((item) => item.id === scenario.projectId)?.name || '—'}</p>}</td>
                    <th scope="row" className="max-w-[320px] break-words px-3 py-2 text-left font-normal"><button className="text-left font-mono text-sm underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]" disabled={busy} onClick={() => editScenario(scenario)}>{scenario.scriptFile || scenario.title}</button>{scenario.scriptFile && scenario.title !== scenario.scriptFile && <p className="mt-1 text-xs text-[var(--muted)]">{scenario.title}</p>}</th>
                    <td className="whitespace-nowrap px-3 py-2"><time dateTime={scenario.executedAt || undefined}>{displayDate(scenario.executedAt)}</time></td>
                    <td><StatusBadge status={status} />{scenario.blockers?.length > 0 && <ul className="mt-2 space-y-1 text-xs">{scenario.blockers.map(cause => <li key={`${cause.kind}-${cause.id}`}><button className="text-left underline" onClick={() => navigate(cause.kind === 'bugs' ? 'Bugs' : 'Impactos')}>{t(cause.kind === 'bugs' ? 'Bug' : 'Impediment')}: {cause.desc}</button></li>)}</ul>}</td>
                    <td className="min-w-40 max-w-72 whitespace-pre-wrap break-words px-3 py-2 text-sm">{scenario.notes || '—'}{scenario.exclusionReason && <p className="mt-1">{t('Exclusion reason')}: {scenario.exclusionReason}</p>}</td>
                    <td className="px-3 py-2"><button className="whitespace-nowrap text-xs font-semibold underline" aria-expanded={expandedId === scenario.id} aria-controls={`scenario-details-${scenario.id}`} onClick={() => setExpandedId(expandedId === scenario.id ? null : scenario.id)}>{t('Impediments')} ({linked.length})</button></td>
                    <td className="px-3 py-2"><Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => editScenario(scenario)}>{t('Edit')}</Button></td>
                  </tr>
                  {expandedId === scenario.id && <tr id={`scenario-details-${scenario.id}`}><td colSpan={8} className="bg-[var(--surface-muted)] p-4">
                    <p>{scenario.description || scenario.title}</p>
                    <div className="mt-3 flex gap-3"><Button variant="secondary" onClick={() => navigate('Impactos')}>{t('Manage impediments')}</Button><Button variant="secondary" onClick={() => navigate('Bugs')}>{t('Manage bugs')}</Button></div>
                  </td></tr>}
                </Fragment>
              })}
            </tbody>
          </table>
          {!visible.length && <EmptyState>{t(scenarios.records.length ? 'No scenarios found.' : 'No scenarios registered. Add the first one to link impediments.')}</EmptyState>}
        </div>
      </>}

      </>}
    </Card>
  </section>
}
