import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarCheck,
  Clock3,
  DollarSign,
  Receipt,
  Salad,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { dashboardApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Card, CardHeader } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { DishImage } from '../../components/ui/DishImage'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useOrderHub } from '../../hooks/useOrderHub'
import { formatCurrency, formatNumber } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'
import { ORDER_STATUS_META } from '../../lib/constants'

/**
 * The admin dashboard.
 *
 * Every chart here answers a question an owner actually asks:
 *   • revenue trend  — "are we growing?"
 *   • orders/day     — "how busy are we, and when?"
 *   • status split   — "is anything stuck in the kitchen?"
 *   • best sellers   — "what should stay on the menu?"
 */
export function DashboardPage() {
  const [days, setDays] = useState(14)
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard', days],
    queryFn: () => dashboardApi.overview(days),
  })

  // Keeps the headline numbers honest while the owner watches the screen during service.
  useOrderHub({
    onOrderPlaced: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    onOrderStatusChanged: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  if (isLoading) return <LoadingState label="Crunching today's numbers…" />
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />

  const { stats, revenueSeries, ordersByStatus, topItems, categorySales } = data

  const trend = revenueSeries.map((point) => ({
    ...point,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  const statusData = ordersByStatus.filter((entry) => entry.count > 0)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the restaurant is doing today, and where it's heading."
        actions={
          <Select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            aria-label="Trend period"
            className="w-40"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={formatCurrency(stats.revenueToday)}
          icon={DollarSign}
          change={stats.revenueChangePercent}
          changeLabel="vs yesterday"
          tone="brand"
        />
        <StatCard
          label="Orders today"
          value={formatNumber(stats.ordersToday)}
          icon={Receipt}
          change={stats.ordersChangePercent}
          changeLabel="vs yesterday"
          tone="info"
        />
        <StatCard
          label="In the kitchen"
          value={formatNumber(stats.pendingOrders)}
          icon={Clock3}
          hint={`${stats.completedOrdersToday} completed today`}
          tone="warning"
        />
        <StatCard
          label="Average order"
          value={formatCurrency(stats.averageOrderValueToday)}
          icon={TrendingUp}
          hint="Today, excluding cancellations"
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Dishes on today's menu" value={stats.itemsOnTodaysMenu} icon={CalendarCheck} />
        <MiniStat label="Active menu items" value={stats.activeMenuItems} icon={Salad} />
        <MiniStat label="Registered customers" value={stats.totalCustomers} icon={Users} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue trend"
            description={`Daily revenue over the last ${days} days, excluding cancelled orders.`}
          />
          <div className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ee6a20" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#ee6a20" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#7c736a' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#7c736a' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                  width={56}
                />
                <Tooltip content={<ChartTooltip currencyKeys={['revenue']} />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#ee6a20"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Orders by status"
            description={`Across the last ${days} days.`}
          />
          <div className="p-5 pt-2">
            {statusData.length === 0 ? (
              <EmptyState title="No orders yet" message="Nothing to break down for this period." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={ORDER_STATUS_META[entry.status].chart} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <ul className="mt-3 space-y-1.5">
                  {statusData.map((entry) => (
                    <li key={entry.status} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: ORDER_STATUS_META[entry.status].chart }}
                        aria-hidden="true"
                      />
                      <span className="text-ink-600">{entry.status}</span>
                      <span className="ml-auto font-semibold text-ink-900">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Orders per day" description="Volume, including cancellations." />
          <div className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#7c736a' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#7c736a' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f1ed' }} />
                <Bar dataKey="orderCount" name="Orders" fill="#1f3d33" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Best sellers"
            description="Most ordered dishes — what to keep on the menu."
          />
          {topItems.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No sales yet" message="Best sellers appear once orders come in." />
            </div>
          ) : (
            <ol className="divide-y divide-ink-200/70">
              {topItems.map((item, index) => (
                <li key={item.menuItemId} className="flex items-center gap-3 p-3.5">
                  <span className="w-5 shrink-0 text-sm font-bold text-ink-400">{index + 1}</span>
                  <DishImage src={item.imageUrl} alt={item.name} className="size-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">{item.name}</p>
                    <p className="text-xs text-ink-500">{item.categoryName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-ink-900">{item.quantitySold} sold</p>
                    <p className="text-xs text-ink-500">{formatCurrency(item.revenue)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {categorySales.length > 0 && (
        <Card className="mt-5">
          <CardHeader
            title="Revenue by category"
            description="Where the money actually comes from."
          />
          <div className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={Math.max(180, categorySales.length * 42)}>
              <BarChart
                data={categorySales}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#7c736a' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  tick={{ fontSize: 12, fill: '#4a443e' }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip content={<ChartTooltip currencyKeys={['revenue']} />} cursor={{ fill: '#f3f1ed' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#ee6a20" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  )
}

function StatCard({ label, value, icon: Icon, change, changeLabel, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    info: 'bg-sky-50 text-sky-600',
    warning: 'bg-amber-50 text-amber-600',
    success: 'bg-emerald-50 text-emerald-600',
  }

  const hasChange = typeof change === 'number'
  const isUp = hasChange && change >= 0

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-ink-900">{value}</p>
        </div>
        <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>

      {hasChange ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
              isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
            )}
          >
            {isUp ? (
              <TrendingUp className="size-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3" aria-hidden="true" />
            )}
            {isUp ? '+' : ''}
            {change}%
          </span>
          <span className="text-ink-500">{changeLabel}</span>
        </p>
      ) : (
        hint && <p className="mt-3 text-xs text-ink-500">{hint}</p>
      )}
    </Card>
  )
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-lg leading-tight font-semibold text-ink-900">{formatNumber(value)}</p>
        <p className="truncate text-xs text-ink-500">{label}</p>
      </div>
    </Card>
  )
}

/** Shared tooltip so every chart formats money and labels the same way. */
function ChartTooltip({ active, payload, label, currencyKeys = [] }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 shadow-lift">
      {label && <p className="mb-1 text-xs font-semibold text-ink-900">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="text-xs text-ink-600">
          <span className="font-medium text-ink-900">{entry.name}: </span>
          {currencyKeys.includes(entry.dataKey)
            ? formatCurrency(entry.value)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  )
}
