import useScenarioExecution from '../hooks/useScenarioExecution'
import { useTranslation } from '../i18n'
import useRecords from '../hooks/useRecords'
import { projectSummary, validBinding } from '../domain/testing'
import { SummaryStrip, Button, Card, EmptyState, SelectField, StatCard, StatusBadge } from './ui'

function FlowSection({ summary, project, navigate }) {
  const { t } = useTranslation()

  const visible = summary.flows
  const statusLink = (flow, key, label) => <button type="button" className="font-semibold underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]" aria-label={t(`${flow.name}: ${flow.summary[key]} ${t(label)}`)} onClick={() => navigate('Cenários', { projectId: project.id, flowId: flow.id, status: label })}>{flow.summary[key]}</button>

  return <><div className="ds-desktop-table mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="ds-table w-full min-w-[760px] border-collapse text-left text-sm" aria-label={t(`Fluxos do projeto ${project.name}`)}>
        <caption className="sr-only">{t("Indicadores de cenários por fluxo do projeto")} {project.name}</caption>
        <thead className="bg-[var(--sidebar)] text-xs uppercase tracking-wide text-white">
          <tr>
            <th scope="col" className="sticky left-0 z-[1] bg-[var(--sidebar)] px-2 py-2 font-semibold">{t("Flow")}</th>
            <th scope="col" className="px-2 py-2 ds-number font-semibold">{t("Scenarios")}</th>
            <th scope="col" className="px-2 py-2 ds-number font-semibold">{t("Passed")}</th>
            <th scope="col" className="px-2 py-2 ds-number font-semibold">{t("Failed")}</th>
            <th scope="col" className="px-2 py-2 ds-number font-semibold">{t("Excluded")}</th>
            <th scope="col" className="bg-[var(--orange-soft)] px-2 py-2 ds-number font-semibold text-[var(--text)]">{t("Pending")}</th>
            <th scope="col" className="ds-number">{t("Blocked")}</th>
            <th scope="col" className="px-2 py-2 font-semibold">{t("Owner")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {visible.map((flow) => <tr key={flow.id} className="bg-[var(--surface)] hover:bg-[var(--hover)]">
            <th scope="row" className="sticky left-0 z-[1] bg-[var(--surface)] px-2 py-2 text-left font-normal">
              <a className="min-w-0 truncate font-semibold hover:text-[var(--accent)]" href={`/cenarios?projectId=${encodeURIComponent(project.id)}&flowId=${encodeURIComponent(flow.id)}`} onClick={(e) => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); navigate('Cenários', { projectId: project.id, flowId: flow.id }) } }}>{flow.name}</a>
            </th>
            <td className="px-2 py-2 ds-number font-semibold">{flow.summary.total}</td>
            <td className="px-2 py-2 ds-number">{statusLink(flow, 'approved', 'Aprovado')}</td>
            <td className="px-2 py-2 ds-number">{statusLink(flow, 'failed', 'Falhado')}</td>
            <td className="px-2 py-2 ds-number">{statusLink(flow, 'excluded', 'Excluído')}</td>
            <td className="bg-[var(--orange-soft)] px-2 py-2 ds-number text-[var(--text)]">{statusLink(flow, 'pending', 'Pendente')}</td>
            <td className="ds-number">{statusLink(flow, 'blocked', 'Bloqueado')}</td>
            <td className="px-2 py-2 text-xs text-[var(--muted)]">{flow.owner}</td>
          </tr>)}
        </tbody>
      </table>
      {!visible.length && <EmptyState>{t(summary.flows.length ? 'No flows match the current filters.' : 'This project has no flows yet.')}</EmptyState>}
    </div>
    <div className="ds-mobile-cards mt-4">{visible.map(flow => <article key={flow.id} className="rounded-xl border border-[var(--border)] p-4"><h3>{flow.name}</h3><p className="text-sm text-[var(--muted)]">{t('Owner')}: {flow.owner}</p><SummaryStrip summary={flow.summary} /><Button variant="secondary" onClick={() => navigate('Cenários', {projectId:project.id,flowId:flow.id})}>{t('View scenarios')}</Button></article>)}</div>
    {!visible.length && <div className="mt-4"><Button onClick={() => navigate('Configuração', {section:'flows'})}>{t('Create flow')}</Button></div>}
    </>
}

export default function ProjectOverview({ params, navigate }) {
  const { t } = useTranslation()

  const projects = useRecords('projects'), flows = useRecords('flows'), scenarios = useScenarioExecution()
  const loading = projects.loading || flows.loading || scenarios.loading
  const loadError = projects.error || flows.error || scenarios.error
  const project = projects.records.find((p) => p.id === params.projectId)
  const summary = projectSummary(project?.id, flows.records, scenarios.records)
  const unassigned = scenarios.records.filter((s) => !validBinding(s, projects.records, flows.records)).length
  return <section className="space-y-3">
    {loadError && <p role="alert">{t(loadError)}</p>}
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {project && <p className="mt-1 text-sm text-[var(--muted)]">{t("Owner: ")}{project.owner}{t("· Project status: ")}<StatusBadge status={summary.situation} /></p>}
        </div>
        <div className="w-full sm:max-w-xs">
          <SelectField label={t("Project")} value={params.projectId || ''} options={[{ value: '', label: 'Select a project' }, ...projects.records.map((p) => ({ value: p.id, label: p.name }))]} onChange={(e) => { navigate('Visão do Projeto', { projectId: e.target.value }) }} />
        </div>
      </div>
      {loading ? <p role="status" className="mt-3">{t("Loading project…")}</p> : !loadError && <>
      {unassigned > 0 && <div className="mt-3 rounded-xl border border-[var(--orange)] bg-[var(--orange-soft)] p-3"><p>{unassigned}{t(" scenario(s) need a valid project and flow link. They are excluded from metrics.")}</p><Button variant="secondary" className="mt-2" onClick={() => navigate('Cenários', { unassigned: '1' })}>{t("Link existing scenarios")}</Button></div>}
      {!project ? <EmptyState action={!projects.records.length && <Button onClick={() => navigate('Configuração', {section:'projects'})}>{t('Create project')}</Button>}>{params.projectId ? 'Project not found. Select another project.' : 'Select a project to track tests.'}</EmptyState> : <>
        <SummaryStrip summary={summary} />
        <FlowSection summary={summary} project={project} navigate={navigate} />
      </>}
    </>}
    </Card>
  </section>
}
