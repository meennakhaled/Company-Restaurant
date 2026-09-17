import { AlertTriangle, Loader2, RefreshCw, SearchX } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'

export function Spinner({ className }) {
  return <Loader2 className={clsx('size-5 animate-spin text-brand-600', className)} aria-hidden="true" />
}

export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-16 text-ink-500', className)}>
      <Spinner className="size-7" />
      <p className="text-sm">{label}</p>
      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  )
}

/**
 * Shown when a request fails. Always offers a retry — a dead end with no way forward is
 * the most frustrating thing a UI can do.
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry, className }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-rose-200 bg-rose-50/60 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        {message && <p className="mt-1 max-w-md text-sm text-ink-600">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

/** Empty results. Takes an action so the screen suggests what to do next. */
export function EmptyState({ icon: Icon = SearchX, title, message, action, className }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-ink-300 bg-white px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        {message && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-lg bg-ink-200/70', className)} />
}

/** Card-shaped placeholders so the menu grid doesn't collapse while it loads. */
export function CardSkeletonGrid({ count = 6, className }) {
  return (
    <div className={clsx('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-card border border-ink-200/70 bg-white">
          <Skeleton className="h-44 rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="divide-y divide-ink-200/70">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={clsx('h-3.5', columnIndex === 0 ? 'w-1/4' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
