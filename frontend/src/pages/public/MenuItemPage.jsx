import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, Flame, Leaf, Minus, Plus, Sparkles } from 'lucide-react'
import { menuApi } from '../../services'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Card'
import { DishImage } from '../../components/ui/DishImage'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { useCart } from '../../hooks'
import { formatCurrency } from '../../lib/format'
import { getErrorMessage } from '../../lib/apiClient'

export function MenuItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)

  const { data: item, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['menu', 'item', id],
    queryFn: () => menuApi.item(id),
  })

  if (isLoading) return <LoadingState label="Loading dish…" />

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="We couldn't load this dish"
          message={getErrorMessage(error, "This dish may not be on today's menu.")}
          onRetry={refetch}
        />
        <div className="mt-4 text-center">
          <Link to="/menu">
            <Button variant="secondary">Back to the menu</Button>
          </Link>
        </div>
      </div>
    )
  }

  const maxQuantity = item.remainingQuantity ?? 20

  const handleAdd = () => {
    addItem(item, quantity)
    navigate('/menu')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/menu"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to today's menu
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <DishImage
          src={item.imageUrl}
          alt={item.name}
          className="aspect-4/3 w-full rounded-card shadow-soft"
        />

        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            {item.isDailySpecial && (
              <Badge tone="brand">
                <Sparkles className="size-3" aria-hidden="true" />
                Today's special
              </Badge>
            )}
            <Badge tone="neutral">{item.categoryName}</Badge>
            {item.isVegetarian && (
              <Badge tone="success">
                <Leaf className="size-3" aria-hidden="true" />
                Vegetarian
              </Badge>
            )}
            {item.isSpicy && (
              <Badge tone="danger">
                <Flame className="size-3" aria-hidden="true" />
                Spicy
              </Badge>
            )}
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
            {item.name}
          </h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-brand-700">{formatCurrency(item.price)}</span>
            {item.originalPrice && (
              <span className="text-lg text-ink-400 line-through">
                {formatCurrency(item.originalPrice)}
              </span>
            )}
          </div>

          {item.description && (
            <p className="mt-4 leading-relaxed text-ink-600">{item.description}</p>
          )}

          {item.dailyNote && (
            <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span className="font-semibold">From the kitchen:</span> {item.dailyNote}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-ink-200/70 py-4 text-sm">
            <div>
              <dt className="text-ink-500">Preparation time</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-ink-900">
                <Clock className="size-4 text-ink-400" aria-hidden="true" />
                About {item.preparationMinutes} minutes
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Availability today</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">
                {item.isSoldOut
                  ? 'Sold out'
                  : item.remainingQuantity !== null
                    ? `${item.remainingQuantity} portion${item.remainingQuantity === 1 ? '' : 's'} left`
                    : 'Available'}
              </dd>
            </div>
          </dl>

          <div className="mt-auto pt-6">
            {item.isSoldOut ? (
              <div className="rounded-lg bg-ink-100 p-4 text-center">
                <p className="font-semibold text-ink-800">This dish has sold out for today</p>
                <p className="mt-1 text-sm text-ink-600">
                  Our menu changes daily — it may be back tomorrow.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </Button>
                  <span className="w-10 text-center text-sm font-bold" aria-live="polite">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                    disabled={quantity >= maxQuantity}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                <Button size="lg" className="flex-1" onClick={handleAdd}>
                  Add {quantity} to order · {formatCurrency(item.price * quantity)}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
