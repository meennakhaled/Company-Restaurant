import { Link } from 'react-router-dom'
import { Clock, Flame, Leaf, Minus, Plus, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { DishImage } from '../ui/DishImage'
import { Badge } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../lib/format'
import { useCart } from '../../hooks'

/**
 * A dish on the customer menu. Shows the day's effective price (with the original struck
 * through when it's discounted), how many portions are left, and switches to a quantity
 * stepper once the dish is in the cart.
 */
export function MenuItemCard({ item }) {
  const { addItem, updateQuantity, quantityOf } = useCart()
  const quantity = quantityOf(item.id)
  const isLow = item.remainingQuantity !== null && item.remainingQuantity > 0 && item.remainingQuantity <= 5

  return (
    <article
      className={clsx(
        'group flex flex-col overflow-hidden rounded-card border border-ink-200/70 bg-white shadow-soft transition-shadow',
        !item.isSoldOut && 'hover:shadow-lift',
      )}
    >
      <Link to={`/menu/${item.id}`} className="relative block">
        <DishImage
          src={item.imageUrl}
          alt={item.name}
          className="h-44 w-full"
          imageClassName={clsx(
            'transition-transform duration-500 group-hover:scale-105',
            item.isSoldOut && 'grayscale',
          )}
        />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {item.isDailySpecial && (
            <Badge tone="brand" className="shadow-sm">
              <Sparkles className="size-3" aria-hidden="true" />
              Today's special
            </Badge>
          )}
          {item.originalPrice && (
            <Badge tone="danger" className="shadow-sm">
              Save {formatCurrency(item.originalPrice - item.price)}
            </Badge>
          )}
        </div>

        {item.isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/55">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-ink-900">
              Sold out today
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/menu/${item.id}`}>
              <h3 className="truncate font-semibold text-ink-900 hover:text-brand-700">{item.name}</h3>
            </Link>
            <p className="mt-0.5 text-xs text-ink-500">{item.categoryName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold text-ink-900">{formatCurrency(item.price)}</p>
            {item.originalPrice && (
              <p className="text-xs text-ink-400 line-through">{formatCurrency(item.originalPrice)}</p>
            )}
          </div>
        </div>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink-600">{item.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {item.preparationMinutes} min
          </span>
          {item.isVegetarian && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Leaf className="size-3.5" aria-hidden="true" />
              Vegetarian
            </span>
          )}
          {item.isSpicy && (
            <span className="inline-flex items-center gap-1 text-rose-600">
              <Flame className="size-3.5" aria-hidden="true" />
              Spicy
            </span>
          )}
          {isLow && (
            <span className="font-semibold text-amber-700">Only {item.remainingQuantity} left</span>
          )}
        </div>

        <div className="mt-4 pt-1">
          {item.isSoldOut ? (
            <Button variant="secondary" className="w-full" disabled>
              Sold out
            </Button>
          ) : quantity > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateQuantity(item.id, quantity - 1)}
                aria-label={`Remove one ${item.name}`}
                className="size-9 text-brand-800 hover:bg-brand-100"
              >
                <Minus className="size-4" aria-hidden="true" />
              </Button>
              <span className="text-sm font-bold text-brand-800" aria-live="polite">
                {quantity} in order
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateQuantity(item.id, quantity + 1)}
                disabled={item.remainingQuantity !== null && quantity >= item.remainingQuantity}
                aria-label={`Add one more ${item.name}`}
                className="size-9 text-brand-800 hover:bg-brand-100"
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => addItem(item)}>
              <Plus className="size-4" aria-hidden="true" />
              Add to order
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
