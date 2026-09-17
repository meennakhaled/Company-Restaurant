import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bike, CheckCircle2, ChefHat, Clock, PartyPopper, ShoppingBag, Utensils, X } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { orderApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useOrderHub } from '../../hooks/useOrderHub'
import { useTicker } from '../../hooks'
import { formatCurrency, formatRelative, formatTime, minutesSince } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'

/**
 * The kitchen board.
 *
 * Three columns matching the lifecycle, oldest ticket first, with the whole board driven by
 * SignalR so a chef never has to refresh. The primary action per column is a single big
 * button, because this screen gets used with wet hands in a hurry.
 */
const COLUMNS = [
  {
    status: 'New',
    title: 'New orders',
    next: 'Preparing',
    nextLabel: 'Start cooking',
    accent: 'border-t-sky-500',
    badge: 'bg-sky-100 text-sky-700',
  },
  {
    status: 'Preparing',
    title: 'In the kitchen',
    next: 'Ready',
    nextLabel: 'Mark ready',
    accent: 'border-t-amber-500',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    status: 'Ready',
    title: 'Ready to hand over',
    next: 'Completed',
    nextLabel: 'Complete',
    accent: 'border-t-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
  },
]

const TYPE_ICONS = { DineIn: Utensils, Takeaway: ShoppingBag, Delivery: Bike }

/** A ticket sitting this long turns amber, then red. Keeps the board honest about delays. */
const WARN_MINUTES = 15
const LATE_MINUTES = 25

export function KitchenBoardPage() {
  const queryClient = useQueryClient()
  const [detailsId, setDetailsId] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  // Keeps the "12m ago" labels and the lateness colours moving.
  useTicker(30_000)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['kitchen-board'],
    queryFn: () => orderApi.search({ activeOnly: true, sortBy: 'oldest', pageSize: 100 }),
    // A safety net in case the websocket drops; SignalR is the primary update path.
    refetchInterval: 60_000,
  })

  const refreshBoard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kitchen-board'] })
  }, [queryClient])

  useOrderHub({
    onOrderPlaced: (order) => {
      refreshBoard()
      toast.success(`New order ${order.orderNumber}`, {
        description: `${order.itemCount} item${order.itemCount === 1 ? '' : 's'} · ${formatCurrency(order.totalAmount)}`,
      })
    },
    onOrderStatusChanged: refreshBoard,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }) => orderApi.updateStatus(id, status, note),
    onSuccess: (order) => {
      refreshBoard()
      queryClient.invalidateQueries({ queryKey: ['order', String(order.id)] })
      setCancelTarget(null)
      toast.success(`${order.orderNumber} → ${order.status}`)
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  if (isLoading) return <LoadingState label="Loading the board…" />
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />

  const orders = data?.items ?? []
  const byStatus = (status) => orders.filter((order) => order.status === status)

  return (
    <>
      <PageHeader
        title="Kitchen board"
        description="Live tickets, oldest first. Updates arrive automatically — no need to refresh."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
            Live
          </span>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="Nothing in the queue"
          message="Every order has been handed over. New tickets will appear here the moment they're placed."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnOrders = byStatus(column.status)

            return (
              <section key={column.status} className="flex min-w-0 flex-col">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-ink-900">{column.title}</h2>
                  <span
                    className={clsx(
                      'rounded-full px-2.5 py-0.5 text-xs font-bold',
                      column.badge,
                    )}
                  >
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.length === 0 ? (
                    <p className="rounded-card border border-dashed border-ink-300 bg-white/60 px-4 py-8 text-center text-sm text-ink-400">
                      Nothing here right now
                    </p>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderTicket
                        key={order.id}
                        order={order}
                        column={column}
                        isBusy={updateStatus.isPending && updateStatus.variables?.id === order.id}
                        onAdvance={() =>
                          updateStatus.mutate({ id: order.id, status: column.next })
                        }
                        onCancel={() => setCancelTarget(order)}
                        onOpenDetails={() => setDetailsId(order.id)}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <OrderDetailsModal orderId={detailsId} onClose={() => setDetailsId(null)} />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() =>
          updateStatus.mutate({
            id: cancelTarget.id,
            status: 'Cancelled',
            note: 'Cancelled by the kitchen',
          })
        }
        isLoading={updateStatus.isPending}
        title={`Cancel ${cancelTarget?.orderNumber}?`}
        message="The customer is notified immediately and any limited portions go back on today's menu. This can't be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep it"
      />
    </>
  )
}

function OrderTicket({ order, column, isBusy, onAdvance, onCancel, onOpenDetails }) {
  const TypeIcon = TYPE_ICONS[order.type] ?? Utensils
  const waiting = minutesSince(order.placedAt)
  const isLate = waiting >= LATE_MINUTES
  const isWarning = !isLate && waiting >= WARN_MINUTES

  return (
    <Card
      className={clsx(
        'border-t-4 transition-shadow hover:shadow-lift',
        column.accent,
        isLate && 'ring-2 ring-rose-400',
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpenDetails}
            className="min-w-0 text-left font-semibold text-ink-900 hover:text-brand-700"
          >
            {order.orderNumber}
          </button>
          <span
            className={clsx(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
              isLate
                ? 'bg-rose-100 text-rose-700'
                : isWarning
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-ink-100 text-ink-600',
            )}
            title={`Placed at ${formatTime(order.placedAt)}`}
          >
            <Clock className="size-3" aria-hidden="true" />
            {waiting}m
          </span>
        </div>

        <p className="mt-1 truncate text-sm text-ink-600">{order.customerName}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <TypeIcon className="size-3.5" aria-hidden="true" />
            {order.type === 'DineIn' ? `Table ${order.tableNumber ?? '—'}` : order.type}
          </span>
          <span>
            {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
          </span>
          <span className="font-semibold text-ink-700">{formatCurrency(order.totalAmount)}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            isLoading={isBusy}
            onClick={onAdvance}
            variant={column.status === 'Ready' ? 'success' : 'primary'}
          >
            {column.status === 'New' && <ChefHat className="size-4" aria-hidden="true" />}
            {column.status === 'Ready' && <CheckCircle2 className="size-4" aria-hidden="true" />}
            {column.nextLabel}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-ink-400 hover:bg-rose-50 hover:text-rose-600"
            onClick={onCancel}
            aria-label={`Cancel ${order.orderNumber}`}
            title="Cancel order"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

/** Full ticket contents — what the chef actually has to cook. */
function OrderDetailsModal({ orderId, onClose }) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', String(orderId)],
    queryFn: () => orderApi.get(orderId),
    enabled: Boolean(orderId),
  })

  return (
    <Modal
      open={Boolean(orderId)}
      onClose={onClose}
      title={order?.orderNumber ?? 'Order'}
      description={order ? `${order.customerName} · ${formatRelative(order.placedAt)}` : undefined}
      size="md"
    >
      {isLoading || !order ? (
        <LoadingState />
      ) : (
        <div className="space-y-5">
          <ul className="divide-y divide-ink-200/70 rounded-lg border border-ink-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">
                    <span className="mr-1.5 inline-flex size-6 items-center justify-center rounded bg-brand-100 text-xs font-bold text-brand-800">
                      {item.quantity}
                    </span>
                    {item.itemName}
                  </p>
                  {item.notes && (
                    <p className="mt-1 ml-7.5 text-sm font-medium text-rose-600">⚠ {item.notes}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm text-ink-500">
                  {formatCurrency(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          {order.notes && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
                Note from the customer
              </p>
              <p className="mt-1 text-sm text-amber-900">{order.notes}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Order type</dt>
              <dd className="font-medium text-ink-900">
                {order.type}
                {order.tableNumber && ` · Table ${order.tableNumber}`}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Total</dt>
              <dd className="font-medium text-ink-900">{formatCurrency(order.totalAmount)}</dd>
            </div>
            {order.deliveryAddress && (
              <div className="col-span-2">
                <dt className="text-ink-500">Deliver to</dt>
                <dd className="font-medium text-ink-900">{order.deliveryAddress}</dd>
              </div>
            )}
            {order.contactPhone && (
              <div>
                <dt className="text-ink-500">Phone</dt>
                <dd className="font-medium text-ink-900">{order.contactPhone}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Modal>
  )
}
