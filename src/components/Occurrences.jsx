import { useRef, useState } from 'react'
import { useTranslation } from '../i18n'
import useRecords, { saveLocalRecords } from '../hooks/useRecords'
import { deleteDoc, doc } from 'firebase/firestore'
import { db, hasFirebaseConfig } from '../firebase'
import { saveRecord } from '../domain/records'
import { bugStatuses, impedimentStatuses, occurrenceActive, validateOccurrence } from '../domain/occurrences'
import { Button, Card, EmptyState, Field, inputClass, SelectField, StatusBadge } from './ui'

export default function Occurrences({ kind, owner }) {
  const { t, locale } = useTranslation()
  const records = useRecords(kind), projects = useRecords('projects'), flows = useRecords('flows'), scenarios = useRecords('scenarios')
  const bug = kind === 'bugs'
  const statuses = bug ? bugStatuses : impedimentStatuses
  const [form, setForm] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false), [filter, setFilter] = useState('all')
  const lock = useRef(false)
  const loading = records.loading || projects.loading || flows.loading || scenarios.loading
  const loadError = records.error || projects.error || flows.error || scenarios.error
  const edit = (item = {}) => {
    setError(''); setNotice('')
    setForm({ id: item.id || '', desc: item.desc || '', owner: item.developer || item.owner || owner, severity: item.severity || 'Média', status: item.status === 'Corrigido' ? 'Fechado' : item.status === 'Crítico' ? 'Novo' : item.status || statuses[0], blocksExecution: Boolean(item.blocksExecution), projectId: item.projectId || scenarios.records.find(s => s.id === item.scenarioId)?.projectId || '', flowId: item.flowId || '', scenarioIds: item.scenarioIds?.length ? item.scenarioIds : (item.scenarioId ? [item.scenarioId] : []), action: item.action || '', startedAt: item.startedAt || '', resolvedAt: item.resolvedAt || '' })
  }
  const change = key => event => setForm(current => ({ ...current, [key]: event.target.value }))
  const save = async event => {
    event.preventDefault()
    if (lock.current || loading || loadError) return
    lock.current = true; setBusy(true); setError('')
    try {
      validateOccurrence(form, projects.records, flows.records, scenarios.records)
      const { id, ...fields } = form
      const now = new Date().toISOString()
      const active = occurrenceActive(form, kind)
      await saveRecord(kind, id, { ...fields, desc: fields.desc.trim(), owner: fields.owner.trim(), scenarioId: '', startedAt: fields.startedAt || now, resolvedAt: active ? '' : fields.resolvedAt || now }, owner)
      setForm(null); setNotice('Occurrence saved successfully.')
    } catch (e) { setError(e.message) }
    finally { lock.current = false; setBusy(false) }
  }
  const remove = async item => {
    if (lock.current || !window.confirm(t('Delete occurrence? This action cannot be undone.'))) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (hasFirebaseConfig && db) await deleteDoc(doc(db, kind, item.id))
      else saveLocalRecords(kind, records.records.filter(record => record.id !== item.id))
      setNotice('Occurrence deleted successfully.')
    } catch (e) { setError(e.message) }
    finally { lock.current = false; setBusy(false) }
  }
  const timestamp = value => value?.toDate?.() || (value ? new Date(value) : null)
  const date = value => { const d = timestamp(value); return d && !Number.isNaN(d.getTime()) ? d.toLocaleString(locale) : '—' }
  const visible = records.records.filter(item => filter === 'all' || (filter === 'active') === occurrenceActive(item, kind))
  return <section className="space-y-4">
    {(error || loadError) && <p role="alert" className="text-[var(--failure)]">{t(error || loadError)}</p>}
    {notice && <p role="status">{t(notice)}</p>}
    <Card>
      {!form ? <>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <SelectField label={t('Show occurrences')} value={filter} onChange={e => setFilter(e.target.value)} options={[{value:'all',label:t('All')},{value:'active',label:t('Active')},{value:'closed',label:t('Closed')}]} />
          <Button disabled={loading || Boolean(loadError)} onClick={() => edit()}>{t(bug ? 'Add bug' : 'Add impediment')}</Button>
        </div>
        {loading ? <p role="status">{t('Loading…')}</p> : visible.map(item => {
          const ids = item.scenarioIds?.length ? item.scenarioIds : item.scenarioId ? [item.scenarioId] : []
          const start = timestamp(item.startedAt || item.createdAt)
          const end = timestamp(item.resolvedAt) || new Date()
          const hours = start && !Number.isNaN(start.getTime()) ? Math.max(0, Math.floor((end - start) / 3600000)) : null
          return <article key={item.id} className="mb-3 rounded-xl border border-[var(--border)] p-4">
            <div className="flex flex-wrap justify-between gap-3"><h3 className="break-words">{item.desc}</h3><StatusBadge status={item.status} /></div>
            <p className="mt-2 text-sm">{t('Owner')}: {item.owner} · {t('Severity')}: {t(item.severity || 'Média')}</p>
            <p className="mt-2 text-sm">{t('Project')}: {projects.records.find(p => p.id === item.projectId)?.name || '—'}{item.flowId && <> · {t('Flow')}: {flows.records.find(f => f.id === item.flowId)?.name || '—'}</>}</p>
            <p className="mt-2 text-sm">{t('Scope')}: {ids.length ? ids.map(id => scenarios.records.find(s => s.id === id)?.title || id).join(', ') : t(item.flowId ? 'All scenarios in the flow' : 'All scenarios in the project')}</p>
            <p className="mt-2 text-sm">{t('Blocks execution')}: {t(item.blocksExecution ? 'Yes' : 'No')}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{t('Started')}: {date(item.startedAt || item.createdAt)} · {t('Resolved at')}: {date(item.resolvedAt)}{hours !== null && <> · {t('Duration (hours)')}: {hours}</>}</p>
            {item.action && <p className="mt-2 whitespace-pre-wrap text-sm">{item.action}</p>}
            <div className="mt-3 flex gap-3"><Button disabled={busy} variant="secondary" onClick={() => edit(item)}>{t('Edit')}</Button><Button disabled={busy} variant="danger" onClick={() => remove(item)}>{t('Delete')}</Button></div>
          </article>
        })}
        {!loading && !loadError && !visible.length && <EmptyState>{t('No occurrences found.')}</EmptyState>}
      </> : <form onSubmit={save}>
        <Button variant="secondary" disabled={busy} onClick={() => setForm(null)}>{t('Back')}</Button>
        <fieldset disabled={busy || loading || Boolean(loadError)} className="mt-4 space-y-4">
          <Field label={t('Description')}><textarea autoFocus required maxLength={bug ? 300 : 1000} className={inputClass} value={form.desc} onChange={change('desc')} /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t('Owner')}><input required maxLength={80} className={inputClass} value={form.owner} onChange={change('owner')} /></Field>
            <SelectField label={t('Severity')} value={form.severity} onChange={change('severity')} options={['Baixa','Média','Alta','Crítica']} />
            <SelectField label={t('Status')} value={form.status} onChange={change('status')} options={statuses} />
          </div>
          <SelectField required label={t('Project')} value={form.projectId} onChange={e => setForm({...form, projectId:e.target.value,flowId:'',scenarioIds:[]})} options={[{value:'',label:t('Select a project')},...projects.records.map(p=>({value:p.id,label:p.name}))]} />
          <SelectField label={t('Flow')} value={form.flowId} onChange={e=>setForm({...form,flowId:e.target.value,scenarioIds:[]})} options={[{value:'',label:t('All flows')},...flows.records.filter(f=>f.projectId===form.projectId).map(f=>({value:f.id,label:f.name}))]} />
          <fieldset className="rounded-xl border border-[var(--border)] p-4"><legend>{t('Affected scenarios')}</legend>
            <p className="mb-3 text-sm text-[var(--muted)]">{t('Leave unselected to cover the entire selected project or flow.')} {t('Select up to 8 scenarios or choose the entire flow.')}</p>
            {scenarios.records.filter(s=>s.projectId===form.projectId && (!form.flowId || s.flowId===form.flowId)).map(s=><label key={s.id} className="mb-2 flex items-center gap-2"><input type="checkbox" disabled={!form.scenarioIds.includes(s.id) && form.scenarioIds.length >= 8} checked={form.scenarioIds.includes(s.id)} onChange={e=>setForm({...form,scenarioIds:e.target.checked?[...form.scenarioIds,s.id]:form.scenarioIds.filter(id=>id!==s.id)})} />{s.title}</label>)}
          </fieldset>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.blocksExecution} onChange={e=>setForm({...form,blocksExecution:e.target.checked})} />{t('Blocks execution')}</label>
          <p className="text-sm text-[var(--muted)]">{t('Pending scenarios are blocked while any linked blocking cause remains active. Completed executions are preserved.')}</p>
          <Field label={t('Action plan')}><textarea maxLength={2000} className={inputClass} value={form.action} onChange={change('action')} /></Field>
          <Button type="submit">{t(busy ? 'Saving…' : 'Save')}</Button>
        </fieldset>
      </form>}
    </Card>
  </section>
}
