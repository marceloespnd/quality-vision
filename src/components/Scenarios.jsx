import useScenarioExecution from '../hooks/useScenarioExecution'
import { blockersFor, affectsScenario } from '../domain/occurrences'
import { sortScenarios } from '../domain/scenarioSort'
import { useTranslation } from '../i18n'
import { Fragment, useRef, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'
import { saveRecord } from '../domain/records'
import { scenarioStatuses, normalizeStatus, validBinding, validateScenario } from '../domain/testing'
import useRecords, { saveLocalRecords } from '../hooks/useRecords'
import { FilterPanel, ConfirmDialog, Button, Card, EmptyState, Field, inputClass, SectionTitle, SelectField, StatusBadge } from './ui'

export default function Scenarios({ owner, params = {}, navigate }) {
  const { t, locale } = useTranslation()

  const projects = useRecords('projects'), flows = useRecords('flows')
  const [sort, setSort] = useState({ key: '', direction: 'asc' })
  const toggleSort = (key) => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  const [deleteIds, setDeleteIds] = useState(null)
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
  const run = async (action, message, propagate = false) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try { await action(); setNotice(message) }
    catch (e) { setError(e.message || 'Unable to save. Check your connection and access permissions.'); if (propagate) throw e }
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
  const removeSelected = () => run(async () => {
    const ids = deleteIds || []
    if (remote) {
      for (const id of ids) {
        await deleteDoc(doc(db, 'scenarios', id))
        setSelected(current => current.filter(value => value !== id))
      }
    } else {
      saveLocalRecords('scenarios', scenarios.records.filter(scenario => !ids.includes(scenario.id)))
      setSelected(current => current.filter(value => !ids.includes(value)))
    }
  }, `${deleteIds?.length || 0} scenario(s) deleted.`, true)
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

  const selection = scenario => <input type="checkbox" aria-label={`${t('Select')} ${scenario.title}`} checked={selected.includes(scenario.id)} disabled={busy} onChange={event => setSelected(current => event.target.checked ? [...current, scenario.id] : current.filter(id => id !== scenario.id))} />
  const details = scenario => <div className="space-y-3 rounded-lg bg-[var(--surface-muted)] p-4 text-sm">
    <p>{scenario.description || scenario.title}</p>
    <p className="break-all"><strong>{t('Script/file')}: </strong>{scenario.scriptFile || '—'}</p>
    <p><strong>{t('Execution date')}: </strong><time dateTime={scenario.executedAt || undefined}>{displayDate(scenario.executedAt)}</time></p>
    <p className="whitespace-pre-wrap break-words"><strong>{t('Notes')}: </strong>{scenario.notes || '—'}</p>
    {scenario.exclusionReason && <p><strong>{t('Exclusion reason')}: </strong>{scenario.exclusionReason}</p>}
    <p>{t('Impediments')}: {impacts.records.filter(item => affectsScenario(item, scenario)).length}</p>
    {scenario.blockers?.length > 0 && <ul>{scenario.blockers.map(cause => <li key={`${cause.kind}-${cause.id}`}><button className="min-h-11 text-left underline" onClick={() => navigate(cause.kind === 'bugs' ? 'Bugs' : 'Impactos')}>{t(cause.kind === 'bugs' ? 'Bug' : 'Impediment')}: {cause.desc}</button></li>)}</ul>}
    <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => navigate('Impactos')}>{t('Manage impediments')}</Button><Button variant="secondary" onClick={() => navigate('Bugs')}>{t('Manage bugs')}</Button></div>
  </div>
  return <section className="ds-scenarios min-w-0 space-y-3">
    {(error || loadError) && <p role="alert" className="rounded-xl bg-[var(--red-soft)] p-4 text-[var(--red)]">{t(error || loadError)}</p>}
    {notice && <p role="status" className="rounded-xl bg-[var(--green-soft)] p-4 text-[var(--green)]">{t(notice)}</p>}
    <Card className="min-w-0">
      {!form && <>
      <SectionTitle title={t("Scenario execution overview")} action={<div className="flex flex-wrap gap-2"><Button id="add-scenario-button" disabled={busy || loading || Boolean(loadError)} onClick={() => { setNotice(''); setError(''); setEditingId(null); setForm(defaults()) }}>{t("Add scenario")}</Button></div>} />
      <FilterPanel><div className="mb-2 grid gap-3 md:grid-cols-3">
        <SelectField label={t("Filter project")} value={params.projectId || ''} options={[{ value: '', label: 'All projects' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => { setSelected([]); navigate('Cenários', { projectId: e.target.value }) }} />
        <SelectField disabled={!params.projectId} help={!params.projectId ? "Select a project first." : undefined} label={t("Filter flow")} value={params.flowId || ''} options={[{ value: '', label: 'All flows' }, ...flows.records.filter((f) => f.projectId === params.projectId).map((f) => ({ value: f.id, label: f.name }))]} onChange={(e) => { setSelected([]); navigate('Cenários', { ...params, flowId: e.target.value }) }} />
        <SelectField label={t("Filter status")} value={params.status || ''} options={[{ value: '', label: 'All statuses' }, ...scenarioStatuses]} onChange={(e) => { setSelected([]); navigate('Cenários', { ...params, status: e.target.value }) }} />
      </div>
      </FilterPanel>
      {(params.projectId || params.flowId || params.status || params.unassigned) && <Button variant="quiet" onClick={() => navigate('Cenários')}>{t("Clear filters")}</Button>}
      {params.unassigned === '1' && <p>{t("Showing scenarios that need to be linked to a flow.")}</p>}
      {!loading && invalidRoute && <p role="alert">{t("Invalid filter or flow does not belong to the project.")}</p>}
      </>}
      {form && <Button variant="secondary" disabled={busy} className="mb-4" onClick={backToList}>{t("Back to scenarios")}</Button>}
      {form && <form ref={editorRef} onSubmit={save} className="mb-4 rounded-xl border border-[var(--border)] p-4">
        <h2 className="mb-3 font-semibold">{t(editingId ? 'Edit scenario' : 'New scenario')}</h2>
        <fieldset disabled={busy || loading || Boolean(loadError)} className="space-y-4">
          <Field label={t("Scenario name")}><input autoFocus required maxLength={200} className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label={t("Scenario description (optional)")}><textarea rows={3} maxLength={2000} className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <SelectField required label={t("Scenario project")} value={form.projectId} options={[{ value: '', label: 'Select' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => setForm({ ...form, projectId: e.target.value, flowId: '' })} />
          <SelectField required disabled={!form.projectId} help={!form.projectId ? "Select a project first." : undefined} label={t("Scenario flow")} value={form.flowId} options={[{ value: '', label: 'Select' }, ...flows.records.filter((f) => f.projectId === form.projectId).map((f) => ({ value: f.id, label: f.name }))]} onChange={(e) => setForm({ ...form, flowId: e.target.value })} />
          <SelectField label={t("Execution status")} value={form.status} options={scenarioStatuses.filter(status => status !== 'Bloqueado')} onChange={(e) => setForm({ ...form, status: e.target.value, executedAt: ['Aprovado', 'Falhado'].includes(e.target.value) ? form.executedAt || new Date().toISOString().slice(0, 10) : '', exclusionReason: e.target.value === 'Excluído' ? form.exclusionReason : '' })} />
          <Field label={t("Script/file")}><input maxLength={300} className={inputClass} value={form.scriptFile} onChange={(e) => setForm({ ...form, scriptFile: e.target.value })} /></Field>
          {['Aprovado', 'Falhado'].includes(form.status) && <Field label={t("Execution date")}><input required type="date" className={inputClass} value={form.executedAt} onChange={(e) => setForm({ ...form, executedAt: e.target.value })} /></Field>}
          {form.status === 'Excluído' && <Field label={t("Exclusion reason")}><textarea required maxLength={1000} className={inputClass} value={form.exclusionReason} onChange={(e) => setForm({ ...form, exclusionReason: e.target.value })} /></Field>}
          <Field label={t("Notes")}><textarea maxLength={2000} className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex gap-2"><Button type="submit" disabled={busy || !form.title.trim()}>{t(busy ? 'Saving…' : 'Save scenario')}</Button><Button variant="secondary" onClick={backToList}>{t("Cancel")}</Button></div>
        </fieldset>
      </form>}
      {!form && <>
      {selected.some((id) => visible.some((s) => s.id === id)) && <div className="my-4 space-y-3 rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p role="status">{t("Selected items")}: {selected.filter(id => visible.some(s => s.id === id)).length}</p><Button variant="danger" disabled={busy} onClick={() => setDeleteIds(selected.filter(id => visible.some(s => s.id === id)))}>{t("Delete selected")}</Button><Button variant="quiet" onClick={() => setSelected([])}>{t("Clear selection")}</Button></div><p>{t("Associar cenários selecionados ao fluxo: ")}</p><SelectField label={t("Fluxo de destino")} value={targetFlow} onChange={(e) => setTargetFlow(e.target.value)} options={[{ value: '', label: 'Selecione projeto / fluxo' }, ...flows.records.map((f) => ({ value: f.id, label: `${projects.records.find((p) => p.id === f.projectId)?.name || 'Projeto indisponível'} / ${f.name}` }))]} /><Button variant="secondary" disabled={busy || loading || Boolean(loadError) || !targetFlow} onClick={associate}>{t("Associar selecionados")}</Button></div>}
      {loading && <p role="status">{t('Loading scenarios…')}</p>}
      {!loading && !loadError && <>
        {!visible.length ? <EmptyState action={<Button onClick={() => scenarios.records.length ? navigate('Cenários') : projects.records.length && flows.records.length ? setForm(defaults()) : navigate('Configuração', { section: projects.records.length ? 'flows' : 'projects' })}>{t(scenarios.records.length ? 'Clear filters' : projects.records.length && flows.records.length ? 'Add scenario' : projects.records.length ? 'Create flow' : 'Create project')}</Button>}>{t(scenarios.records.length ? 'No scenarios found.' : projects.records.length && flows.records.length ? 'No scenarios registered. Add the first one to link impediments.' : 'Create a project and flow, then add your first scenario.')}</EmptyState> : <>
          <div className="ds-desktop-table rounded-xl border border-[var(--border)]">
            <table className="ds-table ds-scenario-table text-left">
              <caption className="sr-only">{t('Scenario execution overview')}</caption>
              <thead><tr>
                <th scope="col"><input type="checkbox" aria-label={t('Select all visible scenarios')} checked={allSelected} ref={node => { if (node) node.indeterminate = !allSelected && visible.some(item => selected.includes(item.id)) }} disabled={busy} onChange={event => setSelected(event.target.checked ? visible.map(item => item.id) : [])} /></th>
                {[['Script/file','script'], ['Flow','flow'], ['Execution status','status']].map(([label,key]) => <th key={key} scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="min-h-11 text-left" onClick={() => toggleSort(key)}>{t(label)} <span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>)}
                <th scope="col">{t('Actions')}</th>
              </tr></thead>
              <tbody>{visible.map(scenario => <Fragment key={scenario.id}>
                <tr aria-selected={selected.includes(scenario.id)} className="border-t border-[var(--border)]">
                  <td>{selection(scenario)}</td>
                  <th scope="row" className="text-left font-semibold">{scenario.scriptFile || scenario.title}{scenario.scriptFile && <p className="mt-1 text-xs font-normal text-[var(--muted)]">{scenario.title}</p>}</th>
                  <td>{flows.records.find(f => f.id === scenario.flowId)?.name || t('No valid link')}<p className="text-xs text-[var(--muted)]">{projects.records.find(p => p.id === scenario.projectId)?.name}</p></td>
                  <td><StatusBadge status={normalizeStatus(scenario.status)} /></td>
                  <td><div className="ds-scenario-actions"><Button variant="secondary" disabled={busy} onClick={() => editScenario(scenario)} aria-label={`${t('Edit')}: ${scenario.title}`}>{t('Edit')}</Button><Button variant="quiet" aria-expanded={expandedId === scenario.id} aria-controls={`scenario-details-${scenario.id}`} onClick={() => setExpandedId(expandedId === scenario.id ? null : scenario.id)}>{t('Details')}</Button></div></td>
                </tr>
                {expandedId === scenario.id && <tr id={`scenario-details-${scenario.id}`}><td colSpan={5}>{details(scenario)}</td></tr>}
              </Fragment>)}</tbody>
            </table>
          </div>
          <div className="ds-mobile-cards">
            <label className="ds-check-label"><input type="checkbox" checked={allSelected} disabled={busy} ref={node => { if (node) node.indeterminate = !allSelected && visible.some(item => selected.includes(item.id)) }} onChange={e => setSelected(e.target.checked ? visible.map(item => item.id) : [])} />{t('Select all visible scenarios')}</label>

            {visible.map(scenario => <article key={scenario.id} className="rounded-xl border border-[var(--border)] p-4">
              <label className="ds-check-label font-semibold">{selection(scenario)}{scenario.title}</label>
              <p className="my-2 text-sm text-[var(--muted)]">{flows.records.find(f => f.id === scenario.flowId)?.name || t('No valid link')}</p>
              <StatusBadge status={normalizeStatus(scenario.status)} />
              <div className="mt-3"><Button variant="secondary" disabled={busy} onClick={() => editScenario(scenario)} aria-label={`${t('Edit')}: ${scenario.title}`}>{t('Edit')}</Button></div>
              <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2">{t('Details')}</summary>{details(scenario)}</details>
            </article>)}
          </div>
        </>}

      </>}

      </>}
    </Card>
    {deleteIds && <ConfirmDialog title="Delete selected" onCancel={() => setDeleteIds(null)} onConfirm={removeSelected}>
      <p>{t("Selected items")}: {deleteIds.length}</p>
      <ul className="mt-2 list-inside list-disc">{deleteIds.map(id => <li key={id}>{scenarios.records.find(s => s.id === id)?.title || id}</li>)}</ul>
    </ConfirmDialog>}
  </section>
}
