import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './Button'
import { TableSkeleton } from './States'

/**
 * Table shell shared by the admin and staff lists.
 *
 * Columns are declared as `{ key, header, render, className, headerClassName }`, so each
 * page describes its data and gets consistent loading, empty and responsive behaviour for free.
 * On small screens the table scrolls horizontally rather than squashing columns.
 */
export function DataTable({
  columns,
  rows,
  keyField = 'id',
  isLoading,
  emptyState,
  onRowClick,
  className,
}) {
  if (isLoading) {
    return <TableSkeleton columns={columns.length} />
  }

  if (!rows?.length) {
    return <div className="p-5">{emptyState}</div>
  }

  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200/70 bg-ink-50/60">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  'px-5 py-3 text-left text-xs font-semibold tracking-wide text-ink-500 uppercase',
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200/70">
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-brand-50/50' : 'hover:bg-ink-50/60',
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className={clsx('px-5 py-3.5 align-middle', column.className)}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Page control for every paginated list. Hidden entirely when there is only one page. */
export function Pagination({ page, totalPages, totalCount, pageSize, onPageChange, className }) {
  if (!totalPages || totalPages <= 1) return null

  const firstRow = (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, totalCount)

  // Windowed page numbers so 200 pages don't render 200 buttons.
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4))
  const windowEnd = Math.min(totalPages, windowStart + 4)
  const pages = []
  for (let value = windowStart; value <= windowEnd; value += 1) pages.push(value)

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 px-5 py-3.5',
        className,
      )}
    >
      <p className="text-xs text-ink-500">
        Showing <span className="font-semibold text-ink-700">{firstRow}</span>–
        <span className="font-semibold text-ink-700">{lastRow}</span> of{' '}
        <span className="font-semibold text-ink-700">{totalCount}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>

        {pages.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPageChange(value)}
            aria-current={value === page ? 'page' : undefined}
            className={clsx(
              'h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition-colors',
              value === page
                ? 'bg-brand-600 text-white'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )}
          >
            {value}
          </button>
        ))}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </nav>
    </div>
  )
}
