import { useTranslation } from '../i18n'
import { cx } from '../utils'
import { cloneElement, isValidElement, useId, useEffect, useRef, useState } from 'react'
import Icon from './Icon'

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const tone = ['Aprovado', 'Finalizado', 'Corrigido', 'Resolvido'].includes(status) ? 'success' : ['Falhado', 'Crítico', 'Bloqueado'].includes(status) ? 'failure' : status === 'Excluído' ? 'excluded' : ['Pendente', 'Impactado'].includes(status) ? 'pending' : 'info'
  const icon = { success: 'check', failure: 'cross', pending: 'clock', excluded: 'minus', info: 'clock' }[tone]
  return <span className="ds-status" data-tone={tone}><Icon name={icon} />{t(status)}</span>
}

export function Button({ children, variant = 'primary', className = '', disabled = false, ...props }) {
  const { t } = useTranslation()

  const base = 'ds-button transition disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary: 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]',
    quiet: 'text-[var(--text)] hover:bg-[var(--hover)]',
    secondary: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--hover)]',
    danger: 'bg-[var(--danger-action)] text-[var(--danger-action-text)] hover:brightness-110',
  }

  return (
    <button type="button" className={cx(base, variants[variant] || variants.primary, className)} disabled={disabled} {...props}>
      {t(children)}
    </button>
  )
}

export function Card({ children, className = '' }) {
  const { t } = useTranslation()

  return <div className={cx('ds-card rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm', className)}>{t(children)}</div>
}

export function Field({ label, children, help, error }) {
  const { t } = useTranslation()
  const generatedId = useId()
  const id = children?.props?.id || generatedId
  const descriptionId = `${id}-description`
  const control = isValidElement(children) ? cloneElement(children, {
    id, 'aria-invalid': error ? true : children.props['aria-invalid'],
    'aria-describedby': [children.props['aria-describedby'], (help || error) && descriptionId].filter(Boolean).join(' ') || undefined,
  }) : children
  return <div className="flex flex-col gap-2 text-sm text-[var(--text)]">
    <label htmlFor={id} className="font-semibold">{t(label)}{children?.props?.required && <span className="ml-1 text-[var(--muted)]">({t('Required')})</span>}</label>
    {control}
    {(help || error) && <p id={descriptionId} role={error ? 'alert' : undefined} className={cx('text-xs', error ? 'text-[var(--failure)]' : 'text-[var(--muted)]')}>{t(error || help)}</p>}
  </div>
}

export function SelectField({ label, value, onChange, options, help, error, ...props }) {
  const { t } = useTranslation()

  return (
    <Field label={t(label)} help={help} error={error}>
      <select value={value} onChange={onChange} className={inputClass} {...props}>
        {options.map((option) => {
          const labelText = typeof option === 'string' ? option : option.label
          const valueText = typeof option === 'string' ? option : option.value
          return <option key={valueText} value={valueText}>{typeof option === 'string' || !option.value ? t(labelText) : labelText}</option>
        })}
      </select>
    </Field>
  )
}

export function SectionTitle({ title, eyebrow, action }) {
  const { t } = useTranslation()

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{t(eyebrow)}</p>}
        {title && <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{t(title)}</h2>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ title, value, sub, onClick, compact = false, tone = 'info', className = '' }) {
  const { t } = useTranslation()

  const content = <>
      <p className={cx('font-semibold text-[var(--muted)]', compact ? 'text-xs' : 'text-sm')}>{t(title)}</p>
      <p className={cx('font-semibold tracking-tight text-[var(--text)]', compact ? 'mt-1 text-2xl' : 'mt-2 text-3xl')}>{value}</p>
      {sub && <p className="mt-2 text-xs text-[var(--muted)]">{t(sub)}</p>}
    </>
  const baseClassName = cx('ds-stat-card rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-sm transition', onClick && 'ds-stat-interactive hover:bg-[var(--hover)]', compact ? 'p-3' : 'p-4', className)
  return onClick
    ? <button type="button" data-tone={tone} onClick={onClick} className={cx(baseClassName, 'cursor-pointer hover:-translate-y-0.5')}>{content}<span className="ds-stat-link">{t('View details')} <span aria-hidden="true">→</span></span></button>
    : <div data-tone={tone} className={baseClassName}>{content}</div>
}

export const inputClass = 'ds-input w-full border border-[var(--control-border)] bg-[var(--surface-input)] text-[var(--text)] transition'

export function EmptyState({ children, action }) {
  const { t } = useTranslation()

  return <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--muted)]">{t(children)}{action && <div className="mt-4 flex justify-center">{action}</div>}</div>
}

export function LimitSelect({ value, onChange }) {
  const { t } = useTranslation()

  return (
    <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted)]">
      <span>{t("Itens")}</span>
      <select value={value} onChange={onChange} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]">
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="20">20</option>
      </select>
    </label>
  )
}

export function RecordCard({ title, status, meta, onEdit, onDelete }) {
  const { t } = useTranslation()

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-[var(--text)]">{title}</p>
          <p className="mt-2 break-words text-xs text-[var(--muted)]">{meta}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {(onEdit || onDelete) && (
        <div className="mt-3 flex gap-2">
          {onEdit && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onEdit}>{t("Editar")}</Button>}
          {onDelete && <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={onDelete}>{t("Excluir")}</Button>}
        </div>
      )}
    </div>
  )
}

export function ConfigList({ items, onEdit, onDelete }) {
  const { t } = useTranslation()

  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
          <span className="text-sm font-medium text-[var(--text)]">{item}</span>
          <div className="flex gap-2">
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onEdit(item)}>{t("Editar")}</Button>
            <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => onDelete(item)}>{t("Excluir")}</Button>
          </div>
        </div>
      ))}
      {!items.length && <EmptyState>{t("Nenhum item cadastrado.")}</EmptyState>}
    </div>
  )
}

export function TaskRow({ task, onEdit, onDelete }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">{task.desc}</p>
            <StatusBadge status={task.status} />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{task.id} • {task.type || 'Testes'} • {task.project} • {task.squad}{t("• QA: ")}{task.owner}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onEdit}>{t("Editar")}</Button>
          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={onDelete}>{t("Excluir")}</Button>
        </div>
      </div>
    </div>
  )
}

export function LogSection({ logs, onEdit, onDelete }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text)]">{log.message}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{log.createdAt || '—'}</p>
            </div>
            <div className="flex gap-2">
              {onEdit && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onEdit(log)}>{t("Editar")}</Button>}
              {onDelete && <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => onDelete(log)}>{t("Excluir")}</Button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog({ title, children, onCancel, onConfirm, confirmLabel = 'Delete' }) {
  const { t } = useTranslation()
  const ref = useRef(null), cancelRef = useRef(null), locked = useRef(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const id = useId()
  useEffect(() => {
    const previous = document.activeElement
    ref.current.showModal()
    cancelRef.current?.focus()
    return () => { ref.current?.close(); if (previous?.isConnected) previous.focus(); else document.getElementById('page-title')?.focus() }
  }, [])
  const confirm = async () => {
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try { await onConfirm(); onCancel() }
    catch (e) { setError(e.message || 'Unable to save. Check your connection and access permissions.') }
    finally { locked.current = false; setBusy(false) }
  }
  return <dialog ref={ref} className="ds-dialog" aria-labelledby={id} aria-describedby={`${id}-description`} onCancel={e => { e.preventDefault(); if (!locked.current) onCancel() }}>
    <h2 id={id}>{t(title)}</h2>
    <div id={`${id}-description`} className="my-4 text-sm">{children}<p className="mt-3 text-[var(--muted)]">{t('This action cannot be undone.')}</p></div>
    {error && <p role="alert" className="mb-4 text-[var(--failure)]">{t(error)}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <button ref={cancelRef} type="button" className="ds-button border border-[var(--border)]" disabled={busy} onClick={onCancel}>{t('Cancel')}</button>
      <Button variant="danger" disabled={busy} onClick={confirm}>{t(busy ? 'Saving…' : confirmLabel)}</Button>
    </div>
  </dialog>
}

export function SummaryStrip({ summary }) {
  const { t } = useTranslation()
  return <dl className="ds-summary">{[['Total','total'], ['Passed','approved'], ['Failed','failed'], ['Pending','pending'], ['Blocked','blocked'], ['Excluded','excluded']].map(([label,key]) => <div key={key}><dt>{t(label)}</dt><dd>{summary[key]}</dd></div>)}</dl>
}

export function FilterPanel({ children }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const update = () => { if (ref.current) ref.current.open = query.matches }
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return <details ref={ref} className="ds-filter-panel" open><summary className="mb-3 cursor-pointer py-2 font-semibold">{t('Filters')}</summary>{children}</details>
}
