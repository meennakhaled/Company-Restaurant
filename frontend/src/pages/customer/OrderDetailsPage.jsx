import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Phone, StickyNote, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { orderApi } from '../../services'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, StatusBadge } from '../../components/ui/Card'
import { DishImage } from '../../components/ui/DishImage'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { OrderTimeline } from '../../components/orders/OrderTimeline'
import { useOrderHub } from '../../hooks/useOrderHub'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'
import { ORDER_TYPE_META } from '../../lib/constants'

export function OrderDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.get(id),
  })

  // Live updates for this specific order — the customer sees the kitchen's progress
  // without touching the page.
  useOrderHub({
    onOrderStatusChanged: (updated) => {
      if (String(updated.id) !== String(id)) return
      queryClient.setQueryData(['order', id], updated)
      toast.info(`Your order is now ${updated.status.toLowerCase()}`)
    },
  })

  const cancelOrder = useMutation({
    mutationFn: () => orderApi.cancel(id, 'Cancelled by the customer'),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated)
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      setConfirmCancel(false)
      toast.success('Your order was cancelled')
    },
    onError: (mutationError) => {
      setConfirmCancel(false)
      toast.error(getErrorMessage(mutationError))
    },
  })

  if (isLoading) return <LoadingState label="Loading your order…" />

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        <div className="mt-4 text-center">
          <Link to="/my/orders">
            <Button variant="secondary">Back to your orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  const canCancel = order.status === 'New'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/my/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to your orders
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold text-ink-900">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">Placed {formatDateTime(order.placedAt)}</p>
        </div>

        {canCancel && (
          <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
            Cancel order
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Progress" description="Updates arrive live from the kitchen." />
            <div className="p-5">
              <OrderTimeline order={order} />
            </div>
          </Card>

          <Card>
            <CardHeader title={`${order.itemCount} item${order.itemCount === 1 ? '' : 's'}`} />
            <ul className="divide-y divide-ink-200/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 p-4">
                  <DishImage
                    src={item.imageUrl}
                    alt={item.itemName}
                    className="size-14 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900">
                      {item.quantity}× {item.itemName}
                    </p>
                    <p className="text-xs text-ink-500">{formatCurrency(item.unitPrice)} each</p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-brand-700 italic">"{item.notes}"</p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-ink-900">
                    {formatCurrency(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Payment summary" />
            <div className="space-y-2 p-5 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row label="Tax" value={formatCurrency(order.taxAmount)} />
              {order.deliveryFee > 0 && (
                <Row label="Delivery" value={formatCurrency(order.deliveryFee)} />
              )}
              <div className="flex items-baseline justify-between border-t border-ink-200/70 pt-3">
                <span className="font-semibold text-ink-900">Total</span>
                <span className="text-xl font-semibold text-ink-900">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <dl className="space-y-3 p-5 text-sm">
              <Detail icon={Utensils} label="Order type">
                {ORDER_TYPE_META[order.type]?.label ?? order.type}
                {order.tableNumber && ` · Table ${order.tableNumber}`}
              </Detail>

              {order.deliveryAddress && (
                <Detail icon={MapPin} label="Delivering to">
                  {order.deliveryAddress}
                </Detail>
              )}

              {order.contactPhone && (
                <Detail icon={Phone} label="Contact">
                  {order.contactPhone}
                </Detail>
              )}

              {order.notes && (
                <Detail icon={StickyNote} label="Your note">
                  {order.notes}
                </Detail>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelOrder.mutate()}
        isLoading={cancelOrder.isPending}
        title="Cancel this order?"
        message="The kitchen hasn't started it yet, so it can still be cancelled. This can't be undone."
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep my order"
      />
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-600">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  )
}

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="font-medium break-words text-ink-900">{children}</dd>
      </div>
    </div>
  )
}
