import { useTranslation } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import useRecords from '../hooks/useRecords'
import { saveRecord } from '../domain/records'
import { Button, Card, EmptyState, Field, inputClass, SelectField } from './ui'

export default function FlowCatalog({ owner, addRequest = 0 }) {
  const { t } = useTranslation()

  const projects = useRecords('projects')
  const flows = useRecords('flows')
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const handledAddRequest = useRef(0)
  const loading = projects.loading || flows.loading
  const loadError = projects.error || flows.error

  useEffect(() => {
    if (!addRequest || handledAddRequest.current === addRequest || loading || loadError) return
    handledAddRequest.current = addRequest
    setError('')
    setForm({ id: '', name: '', owner, projectId: projects.records[0]?.id || '' })
  }, [addRequest, loading, loadError, owner, projects.records])

  const validProject = Boolean(form && projects.records.some(project => project.id === form.projectId))

  const save = async (event) => {
    event.preventDefault()
    if (!form || lock.current || loading || loadError) return
    const name = form.name.trim()
    const responsible = form.owner.trim()
    if (!validProject) return setError('Select a valid project.')
    if (!name || !responsible) return setError('Fill in project, name, and owner.')
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
      {(error || loadError) && <p role="alert" className="rounded-2xl bg-[var(--red-soft)] p-4 text-[var(--red)]">{t(error || loadError)}</p>}
      <Card>
        {form && <form onSubmit={save} className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField label={t("Project")} required disabled={loading || busy || Boolean(loadError)} value={validProject ? form.projectId : ''} onChange={(event) => setForm({ ...form, projectId: event.target.value })} options={[{ value: '', label: t('Select a project') }, ...projects.records.map((project) => ({ value: project.id, label: project.name }))]} />
            <Field label={t("Flow name")}><input autoFocus required maxLength={120} className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label={t("Owner")}><input required maxLength={80} className={inputClass} value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field>
          </div>
          <div className="mt-3 flex gap-2"><Button type="submit" disabled={busy || loading || Boolean(loadError) || !validProject}>{t(busy ? 'Saving…' : 'Save flow')}</Button><Button variant="secondary" onClick={() => setForm(null)}>{t("Cancel")}</Button></div>
        </form>}
        <div className="space-y-2">
          {loading && <p role="status">{t("Carregando fluxos…")}</p>}
          {!loading && flows.records.map((flow) => <div key={flow.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{flow.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{t("Projeto: ")}{projects.records.find((project) => project.id === flow.projectId)?.name || 'Projeto indisponível'}{t("· Responsável: ")}{flow.owner}</p></div>
            <Button variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={() => { setError(''); setForm({ id: flow.id, name: flow.name, owner: flow.owner, projectId: flow.projectId }) }}>{t("Editar fluxo")}</Button>
          </div>)}
          {!loading && !loadError && !flows.records.length && <EmptyState>{t('Nenhum fluxo cadastrado. Crie o primeiro fluxo.')}</EmptyState>}
        </div>
      </Card>
    </section>
  )
}
