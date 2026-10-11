import { Table } from "../../platform/shared/ui";
import { useState } from 'react'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import { normalizeStatus, scenarioStatuses, validBinding } from '../domain/testing.ts'
import { useTranslation } from '../i18n/index.tsx'
import { Card, EmptyState, SectionTitle, SelectField } from './ui.tsx'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)
const colors = ['217, 151, 53', '58, 174, 132', '224, 104, 123', '133, 153, 185', '150, 119, 218']
const glassFill = index => ({ chart }) => {
  const color = colors[index]
  if (!chart.chartArea) return `rgba(${color}, .5)`
  const { left, top, right, bottom } = chart.chartArea
  const gradient = chart.ctx.createLinearGradient(left, top, right, bottom)
  gradient.addColorStop(0, `rgba(${color}, .28)`)
  gradient.addColorStop(.28, `rgba(${color}, .65)`)
  gradient.addColorStop(.5, `rgba(${color}, .38)`)
  gradient.addColorStop(1, `rgba(${color}, .72)`)
  return gradient
}
const chartText = () => getComputedStyle(document.documentElement).getPropertyValue('--text').trim()
const chartGrid = () => getComputedStyle(document.documentElement).getPropertyValue('--border').trim()

export default function Charts({ projects, flows, execution }) {
  const { t } = useTranslation()
  const [projectId, setProjectId] = useState('')
  const selectedProject = projects.records.some(project => project.id === projectId) ? projectId : ''
  const records = execution.records.filter(record => validBinding(record, projects.records, flows.records) && (!selectedProject || record.projectId === selectedProject))
  const visibleFlows = flows.records.filter(flow => (!selectedProject || flow.projectId === selectedProject) && records.some(record => record.flowId === flow.id))
  const counts = scenarioStatuses.map(status => records.filter(record => normalizeStatus(record.status) === status).length)
  const labels = scenarioStatuses.map(status => t(status))
  const pieData = { labels, datasets: [{ data: counts, backgroundColor: context => glassFill(context.dataIndex)(context), borderColor: 'rgba(255, 255, 255, .65)', borderWidth: 2, hoverBorderColor: 'rgba(255, 255, 255, .9)', hoverOffset: 6 }] }
  const barData = {
    labels: visibleFlows.map(flow => selectedProject ? flow.name : `${projects.records.find(project => project.id === flow.projectId)?.name} · ${flow.name}`),
    datasets: scenarioStatuses.map((status, index) => ({ label: labels[index], backgroundColor: glassFill(index), borderColor: `rgba(${colors[index]}, .8)`, borderWidth: 1, borderRadius: 6, data: visibleFlows.map(flow => records.filter(record => record.flowId === flow.id && normalizeStatus(record.status) === status).length) })),
  }
  const loading = projects.loading || flows.loading || execution.loading
  const error = projects.error || flows.error || execution.error
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { color: chartText(), usePointStyle: true, padding: 18 } } } }

  return <section className="space-y-6" aria-label={t('Charts')}>
    <Card>
      <SectionTitle title={t('Scenario execution')} />
      <SelectField label={t('Project')} value={selectedProject} onChange={event => setProjectId(event.target.value)} options={[{ value: '', label: t('All projects') }, ...projects.records.map(project => ({ value: project.id, label: project.name }))]} />
    </Card>
    {loading ? <p role="status">{t('Loading…')}</p> : error ? <p role="alert">{t(error)}</p> : !records.length ? <Card><EmptyState>{t('No scenarios to display.')}</EmptyState></Card> : <>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <SectionTitle title={t('Scenarios by status')} />
          <div style={{ height: 340 }}><Pie data={pieData} options={options} role="img" aria-label={t('Scenarios by status')} /></div>
        </Card>
        <Card className="min-w-0">
          <SectionTitle title={t('Scenarios by flow')} />
          <div style={{ height: 340 }}><Bar data={barData} options={{ ...options, scales: { x: { stacked: true, ticks: { color: chartText }, grid: { display: false }, border: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: chartText }, grid: { color: chartGrid }, border: { display: false } } } }} role="img" aria-label={t('Scenarios by flow')} /></div>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <Table className="ds-table w-full text-left text-sm">
          <caption className="mb-4 text-left font-semibold">{t('Scenarios by flow')}</caption>
          <thead><tr><th>{t('Project')}</th><th>{t('Flow')}</th>{labels.map(label => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{visibleFlows.map(flow => <tr key={flow.id}><td>{projects.records.find(project => project.id === flow.projectId)?.name}</td><td>{flow.name}</td>{scenarioStatuses.map(status => <td key={status}>{records.filter(record => record.flowId === flow.id && normalizeStatus(record.status) === status).length}</td>)}</tr>)}</tbody>
        </Table>
      </Card>
    </>}
  </section>
}
