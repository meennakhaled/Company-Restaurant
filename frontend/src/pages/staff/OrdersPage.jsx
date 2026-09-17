import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ReceiptText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { orderApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Card, StatusBadge } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { DataTable, Pagination } from '../../components/ui/DataTable'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { Modal } from '../../components/ui/Modal'
import { DishImage } from '../../components/ui/DishImage'
import { OrderHistoryList } from '../../components/orders/OrderTimeline'
import { useDebounced } from '../../hooks'
import { useOrderHub } from '../../hooks/useOrderHub'
import { formatCurrency, formatDateTime, formatRelative } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'
import { ORDER_STATUS_META, ORDER_TYPE_META } from '../../lib/constants'

const PAGE_SIZE = 15

/**
 * The searchable order log, shared by staff and admins. The kitchen board handles the live
 * queue; this screen is for looking things up — "what did table 12 order yesterday?".
 */
export function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)

  const debouncedSearch = useDebounced(search)
  const queryClient = useQueryClient()

  useEffect(() => setPage(1), [debouncedSearch, status, type, fromDate, toDate])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', { debouncedSearch, status, type, fromDate, toDate, page }],
    queryFn: () =>
      orderApi.search({
        search: debouncedSearch || undefined,
        status: status || undefined,
        type: type || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  useOrderHub({
    onOrderPlaced: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onOrderStatusChanged: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })

  const hasFilters = Boolean(search || status || type || fromDate || toDate)

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setType('')
    setFromDate('')
    setToDate('')
  }

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (order) => (
        <div>
          <p className="font-semibold text-ink-900">{order.orderNumber}</p>
          <p className="text-xs text-ink-500">{formatRelative(order.placedAt)}</p>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (order) => <span className="text-ink-700">{order.customerName}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (order) => (
        <span className="text-ink-600">
          {ORDER_TYPE_META[order.type]?.label ?? order.type}
          {order.tableNumber && <span className="block text-xs text-ink-400">Table {order.tableNumber}</span>}
        </span>
      ),
    },
    {
      key: 'itemCount',
      header: 'Items',
      render: (order) => <span className="text-ink-600">{order.itemCount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (order) => (
        <span className="font-semibold text-ink-900">{formatCurrency(order.totalAmount)}</span>
      ),
    },
    {
      key: 'placedAt',
      header: 'Placed',
      render: (order) => <span className="text-xs text-ink-500">{formatDateTime(order.placedAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order, searchable by number, customer or date."
      />

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number, name or email…"
              aria-label="Search orders"
              className="w-full rounded-lg border border-ink-200 py-2.5 pr-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>

          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.keys(ORDER_STATUS_META).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {Object.entries(ORDER_TYPE_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="From date"
            className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="To date"
            className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        </div>

        {hasFilters && (
          <div className="border-t border-ink-200/70 px-4 py-2.5">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}
      </Card>

      <Card>
        {isError ? (
          <div className="p-5">
            <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.items}
              isLoading={isLoading}
              onRowClick={(order) => setSelectedId(order.id)}
              emptyState={
                <EmptyState
                  icon={ReceiptText}
                  title="No orders found"
                  message={
                    hasFilters
                      ? 'Try widening your filters or clearing the date range.'
                      : 'Orders will appear here as customers place them.'
                  }
                  action={
                    hasFilters && (
                      <Button variant="secondary" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )
                  }
                />
              }
            />

            {data && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                totalCount={data.totalCount}
                pageSize={data.pageSize}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      <OrderDetailsModal orderId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  )
}

/** Full order view with the status controls the server says are legal for this order. */
function OrderDetailsModal({ orderId, onClose }) {
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', String(orderId)],
    queryFn: () => orderApi.get(orderId),
    enabled: Boolean(orderId),
  })

  const updateStatus = useMutation({
    mutationFn: (status) => orderApi.updateStatus(orderId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', String(orderId)], updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-board'] })
      toast.success(`${updated.orderNumber} → ${updated.status}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <Modal
      open={Boolean(orderId)}
      onClose={onClose}
      title={order?.orderNumber ?? 'Order'}
      description={order ? `${order.customerName} · ${order.customerEmail}` : undefined}
      size="lg"
      footer={
        order?.allowedNextStatuses?.length ? (
          <>
            <span className="mr-auto self-center text-xs text-ink-500">Move this order to:</span>
            {order.allowedNextStatuses.map((status) => (
              <Button
                key={status}
                variant={status === 'Cancelled' ? 'danger' : 'primary'}
                size="sm"
                isLoading={updateStatus.isPending && updateStatus.variables === status}
                onClick={() => updateStatus.mutate(status)}
              >
                {status}
              </Button>
            ))}
          </>
        ) : (
          <span className="text-sm text-ink-500">This order is final and can no longer change.</span>
        )
      }
    >
      {isLoading || !order ? (
        <div className="py-8 text-center text-sm text-ink-500">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-sm text-ink-500">
              {ORDER_TYPE_META[order.type]?.label}
              {order.tableNumber && ` · Table ${order.tableNumber}`}
            </span>
            <span className="ml-auto text-sm text-ink-500">{formatDateTime(order.placedAt)}</span>
          </div>

          <ul className="divide-y divide-ink-200/70 rounded-lg border border-ink-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-3">
                <DishImage src={item.imageUrl} alt={item.itemName} className="size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900">
                    {item.quantity}× {item.itemName}
                  </p>
                  <p className="text-xs text-ink-500">{formatCurrency(item.unitPrice)} each</p>
                  {item.notes && <p className="mt-0.5 text-xs text-rose-600">⚠ {item.notes}</p>}
                </div>
                <span className="font-semibold text-ink-900">{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-900">Payment</h3>
              <dl className="space-y-1.5 text-sm">
                <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal)} />
                <SummaryRow label="Tax" value={formatCurrency(order.taxAmount)} />
                {order.deliveryFee > 0 && (
                  <SummaryRow label="Delivery" value={formatCurrency(order.deliveryFee)} />
                )}
                <div className="flex justify-between border-t border-ink-200 pt-1.5 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatCurrency(order.totalAmount)}</dd>
                </div>
              </dl>

              {order.deliveryAddress && (
                <p className="mt-3 text-sm">
                  <span className="text-ink-500">Deliver to: </span>
                  <span className="text-ink-900">{order.deliveryAddress}</span>
                </p>
              )}
              {order.notes && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">
                  <span className="font-semibold">Customer note:</span> {order.notes}
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-900">History</h3>
              <OrderHistoryList history={order.statusHistory} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  )
}
