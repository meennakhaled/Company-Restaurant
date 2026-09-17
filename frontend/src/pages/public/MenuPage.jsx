import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, UtensilsCrossed, X } from 'lucide-react'
import clsx from 'clsx'
import { categoryApi, menuApi } from '../../services'
import { MenuItemCard } from '../../components/menu/MenuItemCard'
import { Button } from '../../components/ui/Button'
import { Select, Toggle } from '../../components/ui/Field'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../../components/ui/States'
import { Pagination } from '../../components/ui/DataTable'
import { useCart, useDebounced } from '../../hooks'
import { useRestaurant } from '../../hooks/useRestaurant'
import { getErrorMessage } from '../../lib/apiClient'
import { formatDateKey } from '../../lib/format'

const SORT_OPTIONS = [
  { value: '', label: "Chef's order (specials first)" },
  { value: 'price:false', label: 'Price: low to high' },
  { value: 'price:true', label: 'Price: high to low' },
  { value: 'name:false', label: 'Name: A to Z' },
]

const PAGE_SIZE = 12

export function MenuPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sort, setSort] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [onlySpecials, setOnlySpecials] = useState(false)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const debouncedSearch = useDebounced(search)
  const { syncServiceDate } = useCart()
  const { serviceDate } = useRestaurant()

  // Today's menu is a different menu from yesterday's — drop a stale cart rather than
  // letting the customer reach checkout with dishes we're no longer serving.
  useEffect(() => syncServiceDate(serviceDate), [serviceDate, syncServiceDate])

  // Any filter change invalidates the current page number.
  useEffect(() => setPage(1), [debouncedSearch, categoryId, sort, onlyAvailable, onlySpecials])

  const { data: categories } = useQuery({
    queryKey: ['categories', 'public'],
    queryFn: () => categoryApi.list(false),
    staleTime: 5 * 60 * 1000,
  })

  const [sortBy, sortDescending] = sort ? sort.split(':') : ['', 'false']

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['menu', { debouncedSearch, categoryId, sort, onlyAvailable, onlySpecials, page }],
    queryFn: () =>
      menuApi.browse({
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        sortBy: sortBy || undefined,
        sortDescending: sortDescending === 'true',
        onlyAvailable,
        onlySpecials,
        page,
        pageSize: PAGE_SIZE,
      }),
    // Keeps the previous page on screen while the next one loads, so the grid never blinks.
    placeholderData: keepPreviousData,
  })

  const items = data?.items ?? []
  const hasFilters = Boolean(search || categoryId || sort || onlySpecials || !onlyAvailable)

  const clearFilters = () => {
    setSearch('')
    setCategoryId('')
    setSort('')
    setOnlySpecials(false)
    setOnlyAvailable(true)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">
          {formatDateKey(serviceDate)}
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Today's menu
        </h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          Everything here was chosen by our chefs for today. When something sells out it
          disappears from the menu, so you'll only ever order what we can actually cook.
        </p>
      </header>

      <div className="mb-6 rounded-card border border-ink-200/70 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dishes, ingredients or categories…"
              aria-label="Search the menu"
              className="w-full rounded-lg border border-ink-200 bg-white py-2.5 pr-3 pl-9 text-sm shadow-sm placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="sm:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
          </Button>

          <div className="hidden items-center gap-3 sm:flex">
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort dishes"
              className="w-56"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className={clsx('mt-4 space-y-4', !filtersOpen && 'hidden sm:block')}>
          <div className="flex flex-wrap gap-2">
            <CategoryChip active={!categoryId} onClick={() => setCategoryId('')}>
              All dishes
            </CategoryChip>
            {categories?.map((category) => (
              <CategoryChip
                key={category.id}
                active={String(categoryId) === String(category.id)}
                onClick={() => setCategoryId(String(category.id))}
              >
                {category.name}
                <span className="ml-1 text-xs opacity-60">{category.menuItemCount}</span>
              </CategoryChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink-200/70 pt-3">
            <Toggle
              checked={onlySpecials}
              onChange={setOnlySpecials}
              label="Chef's specials only"
            />
            <Toggle
              checked={onlyAvailable}
              onChange={setOnlyAvailable}
              label="Hide sold-out dishes"
            />

            <div className="sm:hidden">
              <Select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort dishes">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <CardSkeletonGrid count={6} />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No dishes match your search"
          message={
            hasFilters
              ? 'Try clearing a filter or searching for something else.'
              : "Today's menu hasn't been published yet. Please check back shortly."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-500" aria-live="polite">
            {data.totalCount} dish{data.totalCount === 1 ? '' : 'es'} available
            {isFetching && <span className="ml-2 text-ink-400">updating…</span>}
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            pageSize={data.pageSize}
            onPageChange={(next) => {
              setPage(next)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="mt-6 rounded-card border border-ink-200/70 bg-white"
          />
        </>
      )}
    </div>
  )
}

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-ink-100 text-ink-700 hover:bg-ink-200',
      )}
    >
      {children}
    </button>
  )
}
