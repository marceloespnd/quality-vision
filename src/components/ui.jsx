import { useTranslation } from '../i18n'
import { cx } from '../utils'
import { cloneElement, isValidElement, useId } from 'react'
import Icon from './Icon'

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const tone = ['Aprovado', 'Finalizado', 'Corrigido', 'Resolvido'].includes(status) ? 'success' : ['Falhado', 'Crítico', 'Bloqueado'].includes(status) ? 'failure' : status === 'Excluído' ? 'excluded' : ['Pendente', 'Impactado'].includes(status) ? 'pending' : 'info'
  const icon = { success: 'check', failure: 'cross', pending: 'clock', excluded: 'minus', info: 'clock' }[tone]
  return <span className="ds-status" data-tone={tone}><Icon name={icon} />{t(status)}</span>
}

export function Button({ children, variant = 'primary', className = '', disabled = false, ...props }) {
  const { t } = useTranslation()

  const base = 'ds-button inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60'
  const variants = {
    primary: 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]',
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
    <label htmlFor={id} className="font-semibold">{t(label)}</label>
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
        {title && <h3 className="text-xl font-semibold tracking-tight text-[var(--text)]">{t(title)}</h3>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ title, value, sub, onClick, compact = false, className = '' }) {
  const { t } = useTranslation()

  const content = <>
      <p className={cx('font-semibold text-[var(--muted)]', compact ? 'text-xs' : 'text-sm')}>{t(title)}</p>
      <p className={cx('font-semibold tracking-tight text-[var(--text)]', compact ? 'mt-1 text-2xl' : 'mt-2 text-3xl')}>{value}</p>
      {sub && <p className="mt-2 text-xs text-[var(--muted)]">{t(sub)}</p>}
    </>
  const baseClassName = cx('rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-sm transition hover:bg-[var(--hover)]', compact ? 'p-3' : 'p-4', className)
  return onClick
    ? <button type="button" onClick={onClick} className={cx(baseClassName, 'cursor-pointer hover:-translate-y-0.5')}>{content}</button>
    : <div className={baseClassName}>{content}</div>
}

export const inputClass = 'ds-input w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none ring-0 transition focus:border-[var(--accent)]'

export function EmptyState({ children }) {
  const { t } = useTranslation()

  return <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-[var(--muted)]">{t(children)}</div>
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
