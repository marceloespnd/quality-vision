import { useEffect, useRef, useState } from 'react'
import { projectSummary } from '../domain/testing'
import { useTranslation } from '../i18n'
import { Button, Card, EmptyState, StatusBadge } from './ui'

export default function HomeProjects({ projects, flows, execution, navigate }) {
  const { t } = useTranslation()
  const loading = projects.loading || flows.loading || execution.loading
  const error = projects.error || flows.error || execution.error
  const active = projects.records.map(project => ({ project, summary: projectSummary(project.id, flows.records, execution.records) }))
    .filter(({ summary }) => !['Aprovado', 'Execução concluída com falhas', 'Sem escopo executável'].includes(summary.situation))
    .sort((a, b) => Number(b.summary.blocked > 0) - Number(a.summary.blocked > 0))
  const viewport = useRef(null)
  const [perPage, setPerPage] = useState(1)
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(active.length / perPage)
  const currentPage = Math.min(page, Math.max(0, pageCount - 1))
  const pages = Array.from({ length: pageCount }, (_, index) => active.slice(index * perPage, (index + 1) * perPage))
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setPerPage(Math.max(1, Math.min(5, Math.floor((entry.contentRect.width + 12) / 230))))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [loading, error, active.length > 0])
  useEffect(() => {
    setPage(0)
    viewport.current?.scrollTo({ left: 0, behavior: 'instant' })
  }, [perPage, active.map(({ project }) => project.id).join('|')])
  const goToPage = index => {
    const element = viewport.current
    if (!element) return
    element.scrollTo({ left: index * element.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return <Card className="home-projects">
    <div className="home-projects-heading">
      <div><p className="home-projects-eyebrow">{t('Quality at a glance')}</p><h2>{t('Projects in progress')}</h2><p className="home-projects-description">{t('Swipe to browse active projects, with blocked projects first.')}</p></div>
      <Button variant="secondary" onClick={() => navigate('Visão do Projeto')}>{t('View projects')}</Button>
    </div>
    {loading ? <p role="status">{t('Loading…')}</p> : error ? <p role="alert">{t(error)}</p> : !active.length ? <EmptyState>{t('No projects in progress.')}</EmptyState> : <>
      <div className="home-projects-viewport" ref={viewport} role="region" aria-label={t('Projects in progress')} tabIndex={0} onScroll={event => { const element = event.currentTarget; setPage(Math.round(element.scrollLeft / element.clientWidth)) }} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); goToPage(Math.max(0, Math.min(pageCount - 1, currentPage + (event.key === 'ArrowRight' ? 1 : -1)))) } }}>
      {pages.map((items, index) => <div className="home-projects-page" key={index} style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}>
        {items.map(({ project, summary }) => <article className="home-project-card" key={project.id}>
          <div className="home-project-card-heading"><h3><a title={project.name} href={`/projetos?projectId=${encodeURIComponent(project.id)}`} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate('Visão do Projeto', { projectId: project.id }) } }}>{project.name}</a></h3><StatusBadge status={summary.situation} /></div>
          <p className="home-project-owner" title={`${project.squad || t('Not assigned')} · ${project.owner || t('Not assigned')}`}>{project.squad || t('Not assigned')} · {project.owner || t('Not assigned')}</p>
          <div className="home-project-total"><strong>{summary.total}</strong><span>{t('Total scenarios')}</span></div>
          <div className="home-project-progress-label"><span>{t('Execution')}</span><strong>{summary.progress === null ? '—' : `${Math.round(summary.progress)}%`}</strong></div>
          <div className="home-project-progress" role="progressbar" aria-label={`${project.name}: ${t('Execution')}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progress ?? 0} aria-valuetext={summary.progress === null ? t('No executable scenarios') : `${summary.executed} / ${summary.valid}`}><span style={{ width: `${summary.progress ?? 0}%` }} /></div>
          <dl className="home-project-counts">{[['approved', 'Passed', 'success'], ['failed', 'Failed', 'failure'], ['pending', 'Pending', 'pending'], ['blocked', 'Blocked', 'failure'], ['excluded', 'Excluded', 'excluded']].map(([key, label, tone]) => <div key={key}><dt><span style={{ background: `var(--${tone})` }} />{t(label)}</dt><dd>{summary[key]}</dd></div>)}</dl>
          <Button variant="secondary" onClick={() => navigate('Visão do Projeto', { projectId: project.id })}>{t('View project')}</Button>
        </article>)}
      </div>)}
      </div>
      {pageCount > 1 && <nav className="home-projects-pagination" aria-label={t('Project pages')}>
        <Button variant="secondary" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)} aria-label={t('Previous page')}>‹</Button>
        <div className="home-projects-page-indicators">{pages.map((_, index) => <button type="button" key={index} className="home-projects-page-dot" aria-label={`${t('Page')} ${index + 1}`} aria-current={currentPage === index ? 'page' : undefined} onClick={() => goToPage(index)} />)}</div>
        <span className="home-projects-page-count" role="status">{currentPage + 1} / {pageCount}</span>
        <Button variant="secondary" disabled={currentPage === pageCount - 1} onClick={() => goToPage(currentPage + 1)} aria-label={t('Next page')}>›</Button>
      </nav>}
    </>}
  </Card>
}
