import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Infinity as InfinityIcon,
  Layers,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { dailyMenuApi, menuItemApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Badge, Card, CardHeader } from '../../components/ui/Card'
import { Input, Textarea, Toggle } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { DishImage } from '../../components/ui/DishImage'
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/ui/States'
import { useDebounced } from '../../hooks'
import { useRestaurant } from '../../hooks/useRestaurant'
import { addDays, formatCurrency, formatDateKey, toDateKey } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'

/**
 * The daily menu planner.
 *
 * A week strip rather than a full month calendar: a chef plans a few days ahead, not a
 * quarter, and a week fits on screen without a popup. The strip shows how many dishes each
 * day already has, so gaps in the schedule are obvious at a glance.
 */
export function DailyMenuPlannerPage() {
  // The kitchen's service date, not the browser's — the two can disagree across midnight
  // or timezones, and the server decides which day is being planned. The planner waits for
  // it so its date state is seeded from the right day rather than corrected afterwards.
  const { serviceDate, isLoading } = useRestaurant()

  if (isLoading) return <LoadingState label="Loading the planner…" />

  return <Planner today={serviceDate} />
}

function Planner({ today }) {
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [isCopyOpen, setCopyOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)

  const queryClient = useQueryClient()
  const isPast = selectedDate < today

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  const { data: calendar, isError: isCalendarError } = useQuery({
    queryKey: ['daily-menu-calendar', weekStart],
    queryFn: () => dailyMenuApi.calendar(weekStart, addDays(weekStart, 6)),
  })

  const { data: dailyMenu, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['daily-menu', selectedDate],
    queryFn: () => dailyMenuApi.forDate(selectedDate),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-menu'] })
    queryClient.invalidateQueries({ queryKey: ['daily-menu-calendar'] })
    queryClient.invalidateQueries({ queryKey: ['menu'] })
  }

  const removeItem = useMutation({
    mutationFn: (id) => dailyMenuApi.removeItem(id),
    onSuccess: () => {
      invalidate()
      setRemoving(null)
      toast.success('Removed from the day')
    },
    onError: (mutationError) => {
      setRemoving(null)
      toast.error(getErrorMessage(mutationError))
    },
  })

  const addStaples = useMutation({
    mutationFn: () => dailyMenuApi.addStaples(selectedDate),
    onSuccess: (result) => {
      invalidate()
      toast.success(
        result.addedCount === 0
          ? 'Every staple is already on this day'
          : `Added ${result.addedCount} staple${result.addedCount === 1 ? '' : 's'}`,
      )
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  const toggleSoldOut = useMutation({
    mutationFn: ({ id, isSoldOut }) => dailyMenuApi.setSoldOut(id, isSoldOut),
    onSuccess: (entry) => {
      invalidate()
      toast.success(
        entry.isSoldOut
          ? `${entry.itemName} marked sold out`
          : `${entry.itemName} is back on the menu`,
      )
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  const countFor = (date) => calendar?.find((day) => day.date === date)?.itemCount ?? 0

  return (
    <>
      <PageHeader
        title="Daily menu planner"
        description="This is the menu. Customers can only see and order the dishes you put on a day — nothing appears on its own, so what you plan here is exactly what the kitchen sells."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => addStaples.mutate()}
              isLoading={addStaples.isPending}
              disabled={isPast}
              title="Add every everyday staple that isn't on this day yet"
            >
              <Layers className="size-4" aria-hidden="true" />
              Add staples
            </Button>
            <Button variant="secondary" onClick={() => setCopyOpen(true)}>
              <Copy className="size-4" aria-hidden="true" />
              Copy day
            </Button>
            <Button onClick={() => setPickerOpen(true)} disabled={isPast}>
              <Plus className="size-4" aria-hidden="true" />
              Add dishes
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <div className="flex items-center gap-2 border-b border-ink-200/70 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>

          <p className="flex-1 text-center text-sm font-semibold text-ink-800">
            {formatDateKey(weekStart, { month: 'long', day: 'numeric' })} –{' '}
            {formatDateKey(addDays(weekStart, 6), { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setWeekStart(startOfWeek(today))
              setSelectedDate(today)
            }}
          >
            Today
          </Button>
        </div>

        <div className="grid grid-cols-7 divide-x divide-ink-200/70">
          {weekDays.map((date) => {
            const count = countFor(date)
            const isSelected = date === selectedDate
            const isToday = date === today
            const inPast = date < today

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                aria-pressed={isSelected}
                className={clsx(
                  'flex flex-col items-center gap-1 px-1 py-3 transition-colors',
                  isSelected ? 'bg-brand-600 text-white' : 'hover:bg-ink-50',
                  inPast && !isSelected && 'opacity-55',
                )}
              >
                <span
                  className={clsx(
                    'text-[11px] font-semibold uppercase',
                    isSelected ? 'text-brand-100' : 'text-ink-500',
                  )}
                >
                  {formatDateKey(date, { weekday: 'short' })}
                </span>
                <span
                  className={clsx(
                    'flex size-8 items-center justify-center rounded-full text-sm font-bold',
                    isToday && !isSelected && 'bg-brand-100 text-brand-800',
                    isSelected && 'bg-white/20',
                  )}
                >
                  {Number(date.split('-')[2])}
                </span>
                <span
                  className={clsx(
                    'text-[11px] font-medium',
                    isSelected ? 'text-brand-100' : count > 0 ? 'text-ink-600' : 'text-ink-400',
                  )}
                >
                  {/* Never claim a day is empty when we simply failed to load the counts. */}
                  {isCalendarError ? '—' : count > 0 ? `${count} dish${count === 1 ? '' : 'es'}` : 'empty'}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={formatDateKey(selectedDate, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          description={
            isPast
              ? 'This date has passed and can no longer be edited.'
              : dailyMenu
                ? `${dailyMenu.totalItems} dish${dailyMenu.totalItems === 1 ? '' : 'es'} scheduled · ${dailyMenu.soldOutItems} sold out`
                : undefined
          }
        />

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5">
            <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
          </div>
        ) : dailyMenu.items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled for this day"
              message={
                isPast
                  ? 'No dishes were planned for this date.'
                  : 'Customers see an empty menu until you plan this day. Start with the staples, copy a previous day, or pick dishes one by one.'
              }
              action={
                !isPast && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => addStaples.mutate()} isLoading={addStaples.isPending}>
                      <Layers className="size-4" aria-hidden="true" />
                      Add staples
                    </Button>
                    <Button variant="secondary" onClick={() => setCopyOpen(true)}>
                      <Copy className="size-4" aria-hidden="true" />
                      Copy another day
                    </Button>
                    <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                      <Plus className="size-4" aria-hidden="true" />
                      Pick dishes
                    </Button>
                  </div>
                )
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-200/70">
            {dailyMenu.items.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-4 p-4">
                <DishImage
                  src={entry.imageUrl}
                  alt={entry.itemName}
                  className={clsx('size-14 shrink-0 rounded-lg', entry.isExhausted && 'grayscale')}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{entry.itemName}</p>
                    {entry.specialPrice && <Badge tone="brand">Special price</Badge>}
                    {entry.isExhausted && <Badge tone="danger">Sold out</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {entry.categoryName} ·{' '}
                    {entry.specialPrice ? (
                      <>
                        <span className="font-semibold text-brand-700">
                          {formatCurrency(entry.effectivePrice)}
                        </span>{' '}
                        <span className="line-through">{formatCurrency(entry.basePrice)}</span>
                      </>
                    ) : (
                      formatCurrency(entry.basePrice)
                    )}
                  </p>
                  {entry.note && (
                    <p className="mt-1 text-xs text-ink-600 italic">"{entry.note}"</p>
                  )}
                </div>

                <div className="flex min-w-32 flex-col items-start text-xs sm:items-end">
                  {entry.quantityAvailable === null ? (
                    <span className="inline-flex items-center gap-1 text-ink-500">
                      <InfinityIcon className="size-3.5" aria-hidden="true" />
                      Unlimited
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold text-ink-900">
                        {entry.remainingQuantity} of {entry.quantityAvailable} left
                      </span>
                      <span className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-ink-200">
                        <span
                          className={clsx(
                            'block h-full rounded-full',
                            entry.remainingQuantity === 0
                              ? 'bg-rose-500'
                              : entry.remainingQuantity <= 3
                                ? 'bg-amber-500'
                                : 'bg-emerald-500',
                          )}
                          style={{
                            width: `${(entry.remainingQuantity / entry.quantityAvailable) * 100}%`,
                          }}
                        />
                      </span>
                    </>
                  )}
                  <span className="mt-1 text-ink-400">{entry.quantitySold} sold</span>
                </div>

                {!isPast && (
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={!entry.isSoldOut}
                      onChange={(checked) =>
                        toggleSoldOut.mutate({ id: entry.id, isSoldOut: !checked })
                      }
                      label={entry.isSoldOut ? 'Sold out' : 'Available'}
                    />
                    <Button variant="secondary" size="sm" onClick={() => setEditing(entry)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-ink-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => setRemoving(entry)}
                      aria-label={`Remove ${entry.itemName}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AddDishesModal
        open={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        date={selectedDate}
        scheduledIds={dailyMenu?.items.map((item) => item.menuItemId) ?? []}
        onSaved={invalidate}
      />

      <EditEntryModal entry={editing} onClose={() => setEditing(null)} onSaved={invalidate} />

      <CopyDayModal
        open={isCopyOpen}
        onClose={() => setCopyOpen(false)}
        defaultSource={selectedDate}
        today={today}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removeItem.mutate(removing.id)}
        isLoading={removeItem.isPending}
        title={`Remove ${removing?.itemName}?`}
        message="It disappears from this day's menu straight away. Dishes that have already been ordered can't be removed — mark them sold out instead."
        confirmLabel="Remove"
      />
    </>
  )
}

/** Picks dishes from the catalogue and schedules them onto the selected date. */
function AddDishesModal({ open, onClose, date, scheduledIds, onSaved }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [adding, setAdding] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['menu-items', 'picker', debouncedSearch],
    queryFn: () =>
      menuItemApi.search({
        search: debouncedSearch || undefined,
        isAvailable: true,
        pageSize: 50,
        sortBy: 'name',
      }),
    enabled: open,
  })

  const addItem = useMutation({
    mutationFn: ({ menuItemId, quantityAvailable, specialPrice, note }) =>
      dailyMenuApi.addItem(date, {
        menuItemId,
        quantityAvailable: quantityAvailable === '' ? null : Number(quantityAvailable),
        specialPrice: specialPrice === '' ? null : Number(specialPrice),
        note: note?.trim() || null,
      }),
    onSuccess: (entry) => {
      onSaved()
      setAdding(null)
      toast.success(`${entry.itemName} added to ${formatDateKey(date, { month: 'short', day: 'numeric' })}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const available = (data?.items ?? []).filter((item) => !scheduledIds.includes(item.id))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add dishes to the day"
      description={formatDateKey(date, { weekday: 'long', month: 'long', day: 'numeric' })}
      size="lg"
    >
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the catalogue…"
          aria-label="Search dishes"
          className="w-full rounded-lg border border-ink-200 py-2.5 pr-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : available.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No dishes to add"
          message={
            search
              ? 'Nothing matches your search.'
              : 'Every available dish is already scheduled for this day.'
          }
        />
      ) : (
        <ul className="divide-y divide-ink-200/70">
          {available.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex items-center gap-3">
                <DishImage src={item.imageUrl} alt={item.name} className="size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{item.name}</p>
                  <p className="text-xs text-ink-500">
                    {item.categoryName} · {formatCurrency(item.price)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={adding?.menuItemId === item.id ? 'secondary' : 'primary'}
                  onClick={() =>
                    setAdding((current) =>
                      current?.menuItemId === item.id
                        ? null
                        : { menuItemId: item.id, quantityAvailable: '', specialPrice: '', note: '' },
                    )
                  }
                >
                  {adding?.menuItemId === item.id ? 'Cancel' : 'Add'}
                </Button>
              </div>

              {adding?.menuItemId === item.id && (
                <div className="animate-fade-in-up mt-3 grid gap-3 rounded-lg bg-ink-50 p-3 sm:grid-cols-3">
                  <Input
                    label="Portions"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    hint="Leave empty for no limit"
                    value={adding.quantityAvailable}
                    onChange={(event) =>
                      setAdding((current) => ({ ...current, quantityAvailable: event.target.value }))
                    }
                  />
                  <Input
                    label="Special price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={String(item.price)}
                    hint="Optional, this day only"
                    value={adding.specialPrice}
                    onChange={(event) =>
                      setAdding((current) => ({ ...current, specialPrice: event.target.value }))
                    }
                  />
                  <Input
                    label="Note"
                    placeholder="Chef's pick"
                    maxLength={200}
                    value={adding.note}
                    onChange={(event) =>
                      setAdding((current) => ({ ...current, note: event.target.value }))
                    }
                  />
                  <div className="sm:col-span-3">
                    <Button
                      className="w-full"
                      isLoading={addItem.isPending}
                      onClick={() => addItem.mutate(adding)}
                    >
                      Schedule {item.name}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

function EditEntryModal({ entry, onClose, onSaved }) {
  const [form, setForm] = useState(null)

  // Seed the form the first time this entry opens.
  if (entry && (!form || form.id !== entry.id)) {
    setForm({
      id: entry.id,
      quantityAvailable: entry.quantityAvailable ?? '',
      specialPrice: entry.specialPrice ?? '',
      isSoldOut: entry.isSoldOut,
      note: entry.note ?? '',
    })
  }

  const mutation = useMutation({
    mutationFn: () =>
      dailyMenuApi.updateItem(form.id, {
        quantityAvailable: form.quantityAvailable === '' ? null : Number(form.quantityAvailable),
        specialPrice: form.specialPrice === '' ? null : Number(form.specialPrice),
        isSoldOut: form.isSoldOut,
        note: form.note?.trim() || null,
      }),
    onSuccess: () => {
      onSaved()
      onClose()
      toast.success('Updated')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (!entry || !form) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${entry.itemName}`}
      description={`${entry.quantitySold} portion${entry.quantitySold === 1 ? '' : 's'} already ordered`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Portions available today"
          type="number"
          min={entry.quantitySold}
          placeholder="Unlimited"
          hint={`Leave empty for no limit. Cannot go below the ${entry.quantitySold} already ordered.`}
          value={form.quantityAvailable}
          onChange={(event) => setForm({ ...form, quantityAvailable: event.target.value })}
        />

        <Input
          label="Special price for this day"
          type="number"
          min="0"
          step="0.01"
          placeholder={String(entry.basePrice)}
          hint={`Regular price is ${formatCurrency(entry.basePrice)}. Leave empty to use it.`}
          value={form.specialPrice}
          onChange={(event) => setForm({ ...form, specialPrice: event.target.value })}
        />

        <Textarea
          label="Kitchen note"
          rows={2}
          maxLength={200}
          placeholder="Chef's pick, served with garlic bread…"
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />

        <Toggle
          checked={form.isSoldOut}
          onChange={(checked) => setForm({ ...form, isSoldOut: checked })}
          label="Mark as sold out"
          description="Stops new orders immediately without removing the dish from the day."
        />
      </div>
    </Modal>
  )
}

/** "Same as last Friday" — the fastest way to plan a week. */
function CopyDayModal({ open, onClose, defaultSource, today, onSaved }) {
  const [source, setSource] = useState(defaultSource)
  const [targets, setTargets] = useState([])
  const [overwrite, setOverwrite] = useState(false)

  const upcoming = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(today, index + 1)),
    [today],
  )

  const mutation = useMutation({
    mutationFn: () =>
      dailyMenuApi.copy({ sourceDate: source, targetDates: targets, overwrite }),
    onSuccess: (result) => {
      onSaved()
      onClose()
      setTargets([])
      toast.success(`Copied ${result.copiedCount} dish${result.copiedCount === 1 ? '' : 'es'}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const toggleTarget = (date) =>
    setTargets((current) =>
      current.includes(date) ? current.filter((value) => value !== date) : [...current, date],
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Copy a day's menu"
      description="Duplicate a planned day onto other dates. Dishes already scheduled on a target date are kept."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={targets.length === 0}
          >
            Copy to {targets.length} date{targets.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="Copy from"
          type="date"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-ink-800">Copy to</p>
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {upcoming.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => toggleTarget(date)}
                aria-pressed={targets.includes(date)}
                className={clsx(
                  'rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors',
                  targets.includes(date)
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-ink-200 text-ink-700 hover:bg-ink-50',
                )}
              >
                {formatDateKey(date, { weekday: 'short', month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          checked={overwrite}
          onChange={setOverwrite}
          label="Replace existing plans"
          description="Clears dishes already scheduled on the target dates first. Dishes that have already been ordered are always kept."
        />
      </div>
    </Modal>
  )
}

/** Monday-based week start for the date strip. */
function startOfWeek(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return toDateKey(date)
}
