import clsx from 'clsx'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx('rounded-card border border-ink-200/70 bg-white shadow-soft', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3 border-b border-ink-200/70 p-5', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={clsx('p-5', className)}>{children}</div>
}

export function Badge({ tone = 'neutral', className, children }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700 ring-ink-500/20',
    brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Status pill for orders — colour and label come from the shared status metadata. */
export function StatusBadge({ status, className }) {
  // Imported lazily at module scope would create a cycle with constants; keep the map local.
  const meta = STATUS_STYLES[status] ?? STATUS_STYLES.New

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        meta.badge,
        className,
      )}
    >
      <span className={clsx('size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {status}
    </span>
  )
}

const STATUS_STYLES = {
  New: { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  Preparing: { badge: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  Ready: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  Completed: { badge: 'bg-ink-100 text-ink-700 ring-ink-500/20', dot: 'bg-ink-400' },
  Cancelled: { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
}
