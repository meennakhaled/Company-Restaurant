import { Check, ChefHat, CircleDot, PackageCheck, X } from 'lucide-react'
import clsx from 'clsx'
import { formatDateTime } from '../../lib/format'

const STEPS = [
  { status: 'New', label: 'Order received', icon: CircleDot, hint: 'Sent to the kitchen' },
  { status: 'Preparing', label: 'Being prepared', icon: ChefHat, hint: 'The chefs are on it' },
  { status: 'Ready', label: 'Ready', icon: PackageCheck, hint: 'Waiting at the pass' },
  { status: 'Completed', label: 'Completed', icon: Check, hint: 'Handed over' },
]

const STEP_INDEX = { New: 0, Preparing: 1, Ready: 2, Completed: 3 }

/**
 * Customer-facing progress tracker. A cancelled order gets its own terminal state rather
 * than being shown as a half-finished pipeline.
 */
export function OrderTimeline({ order }) {
  if (order.status === 'Cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-card border border-rose-200 bg-rose-50 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <X className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-rose-900">This order was cancelled</p>
          <p className="mt-0.5 text-sm text-rose-700">
            {order.cancellationReason || 'No reason was recorded.'}
          </p>
          <p className="mt-1 text-xs text-rose-600">{formatDateTime(order.cancelledAt)}</p>
        </div>
      </div>
    )
  }

  const currentIndex = STEP_INDEX[order.status] ?? 0
  const timestamps = {
    New: order.placedAt,
    Preparing: order.preparingAt,
    Ready: order.readyAt,
    Completed: order.completedAt,
  }

  return (
    <ol className="relative space-y-6" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex

        return (
          <li key={step.status} className="relative flex gap-4 pl-0">
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute top-10 left-[1.125rem] h-[calc(100%+0.25rem)] w-0.5',
                  isDone ? 'bg-brand-500' : 'bg-ink-200',
                )}
              />
            )}

            <span
              className={clsx(
                'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white',
                isDone && 'bg-brand-500 text-white',
                isCurrent && 'animate-pulse-ring bg-brand-600 text-white',
                isPending && 'bg-ink-200 text-ink-500',
              )}
            >
              <step.icon className="size-4.5" aria-hidden="true" />
            </span>

            <div className="min-w-0 pb-1">
              <p
                className={clsx(
                  'font-semibold',
                  isPending ? 'text-ink-400' : 'text-ink-900',
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                    Now
                  </span>
                )}
              </p>
              <p className={clsx('mt-0.5 text-sm', isPending ? 'text-ink-400' : 'text-ink-500')}>
                {timestamps[step.status] ? formatDateTime(timestamps[step.status]) : step.hint}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Staff-facing audit trail: every transition, who made it and when. */
export function OrderHistoryList({ history }) {
  if (!history?.length) {
    return <p className="text-sm text-ink-500">No status changes recorded yet.</p>
  }

  return (
    <ul className="space-y-3">
      {history.map((entry, index) => (
        <li key={index} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-ink-900">
              {entry.fromStatus ? (
                <>
                  <span className="text-ink-500">{entry.fromStatus}</span>
                  <span className="mx-1.5 text-ink-400">→</span>
                  <span className="font-semibold">{entry.toStatus}</span>
                </>
              ) : (
                <span className="font-semibold">{entry.toStatus}</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              {formatDateTime(entry.changedAt)}
              {entry.changedByName && ` · by ${entry.changedByName}`}
            </p>
            {entry.note && <p className="mt-1 text-xs text-ink-600 italic">"{entry.note}"</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
