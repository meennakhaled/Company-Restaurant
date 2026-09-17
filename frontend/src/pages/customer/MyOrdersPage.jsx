import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { orderApi } from '../../services'
import { Button } from '../../components/ui/Button'
import { Card, StatusBadge } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Pagination } from '../../components/ui/DataTable'
import { useOrderHub } from '../../hooks/useOrderHub'
import { formatCurrency, formatDateTime, formatRelative } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'
import { ORDER_STATUS_META, ORDER_TYPE_META } from '../../lib/constants'

const PAGE_SIZE = 8

export function MyOrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-orders', { status, page }],
    queryFn: () => orderApi.mine({ status: status || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  // The customer's own orders arrive over SignalR; the list refreshes without a reload.
  useOrderHub({
    onOrderStatusChanged: (order) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', String(order.id)] })
      toast.info(`Order ${order.orderNumber} is now ${order.status.toLowerCase()}`)
    },
  })

  const orders = data?.items ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900">Your orders</h1>
          <p className="mt-1 text-sm text-ink-500">
            Live status for anything in the kitchen, plus everything you've ordered before.
          </p>
        </div>

        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          aria-label="Filter by status"
          className="w-48"
        >
          <option value="">All orders</option>
          {Object.keys(ORDER_STATUS_META).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading your orders…" />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={status ? `No ${status.toLowerCase()} orders` : 'You haven’t ordered yet'}
          message={
            status
              ? 'Try a different status filter.'
              : "Once you place an order it'll appear here, with live progress from the kitchen."
          }
          action={
            <Link to="/menu">
              <Button>Browse today's menu</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} to={`/my/orders/${order.id}`} className="block">
              <Card className="transition-shadow hover:shadow-lift">
                <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-ink-900">{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-ink-500">
                      {ORDER_TYPE_META[order.type]?.label ?? order.type}
                      {order.tableNumber && ` · Table ${order.tableNumber}`}
                      {' · '}
                      {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatDateTime(order.placedAt)} · {formatRelative(order.placedAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-ink-900">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-xs font-medium text-brand-700">View details →</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            pageSize={data.pageSize}
            onPageChange={setPage}
            className="rounded-card border border-ink-200/70 bg-white"
          />
        </div>
      )}
    </div>
  )
}
