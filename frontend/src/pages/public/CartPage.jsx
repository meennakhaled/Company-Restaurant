import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { orderApi } from '../../services'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DishImage } from '../../components/ui/DishImage'
import { ConfirmDialog } from '../../components/ui/Modal'
import { EmptyState, Spinner } from '../../components/ui/States'
import { useAuth, useCart } from '../../hooks'
import { formatCurrency } from '../../lib/format'

export function CartPage() {
  const { items, isEmpty, updateQuantity, updateNotes, removeItem, clearCart, toOrderPayload } = useCart()
  const { isAuthenticated, isCustomer } = useAuth()
  const [confirmClear, setConfirmClear] = useState(false)
  const navigate = useNavigate()

  // The server re-prices the cart. Anything shown here as a total comes from that call,
  // never from arithmetic done in the browser.
  const { data: preview, isFetching } = useQuery({
    queryKey: ['cart-preview', items.map((i) => `${i.menuItemId}x${i.quantity}`).join('|')],
    queryFn: () => orderApi.preview({ type: 'Takeaway', items: toOrderPayload() }),
    enabled: !isEmpty && isAuthenticated,
  })

  if (isEmpty) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ShoppingBag}
          title="Your order is empty"
          message="Have a look at what the kitchen is cooking today — the menu changes every morning."
          action={
            <Link to="/menu">
              <Button>Browse today's menu</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const unavailableLines = preview?.lines.filter((line) => !line.isAvailable) ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900">Your order</h1>
          <p className="mt-1 text-sm text-ink-500">
            {items.length} dish{items.length === 1 ? '' : 'es'} selected
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
          <Trash2 className="size-4" aria-hidden="true" />
          Clear order
        </Button>
      </div>

      {unavailableLines.length > 0 && (
        <div
          className="mb-5 flex gap-3 rounded-card border border-amber-300 bg-amber-50 p-4"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Some dishes are no longer available</p>
            <ul className="mt-1 space-y-0.5 text-amber-800">
              {unavailableLines.map((line) => (
                <li key={line.menuItemId}>
                  <span className="font-medium">{line.itemName}</span> — {line.unavailableReason}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-amber-800">Remove them to continue to checkout.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {items.map((item) => {
            const line = preview?.lines.find((l) => l.menuItemId === item.menuItemId)
            const isUnavailable = line && !line.isAvailable

            return (
              <Card
                key={item.menuItemId}
                className={isUnavailable ? 'border-amber-300 bg-amber-50/40' : undefined}
              >
                <div className="flex gap-4 p-4">
                  <DishImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-20 shrink-0 rounded-lg sm:size-24"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/menu/${item.menuItemId}`}
                          className="font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-500">{item.categoryName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.menuItemId)}
                        className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.notes ?? ''}
                      onChange={(event) => updateNotes(item.menuItemId, event.target.value)}
                      placeholder="Add a note (no onions, extra sauce…)"
                      maxLength={200}
                      aria-label={`Notes for ${item.name}`}
                      className="mt-2 w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          <Minus className="size-3.5" aria-hidden="true" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                          aria-label={`Increase ${item.name}`}
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-ink-900">
                          {formatCurrency((line?.unitPrice ?? item.price) * item.quantity)}
                        </p>
                        <p className="text-xs text-ink-500">
                          {formatCurrency(line?.unitPrice ?? item.price)} each
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="border-b border-ink-200/70 p-5">
              <h2 className="font-semibold text-ink-900">Order summary</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Prices are confirmed by the kitchen, not calculated here.
              </p>
            </div>

            <div className="space-y-2.5 p-5 text-sm">
              {isFetching && !preview ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : preview ? (
                <>
                  <Row label="Subtotal" value={formatCurrency(preview.subtotal)} />
                  <Row label="Tax" value={formatCurrency(preview.taxAmount)} />
                  <p className="text-xs text-ink-500">
                    Delivery fees are added at checkout if you choose delivery.
                  </p>
                  <div className="mt-3 flex items-baseline justify-between border-t border-ink-200/70 pt-3">
                    <span className="font-semibold text-ink-900">Estimated total</span>
                    <span className="text-xl font-semibold text-ink-900">
                      {formatCurrency(preview.totalAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-ink-500">
                  Sign in to see your total — we price every order against today's live menu.
                </p>
              )}
            </div>

            <div className="border-t border-ink-200/70 p-5">
              {!isAuthenticated ? (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => navigate('/login', { state: { from: { pathname: '/checkout' } } })}
                  >
                    Sign in to checkout
                  </Button>
                  <Link to="/register" className="block">
                    <Button variant="secondary" className="w-full">
                      Create an account
                    </Button>
                  </Link>
                </div>
              ) : !isCustomer ? (
                <p className="rounded-lg bg-ink-100 p-3 text-center text-sm text-ink-600">
                  Staff accounts can't place orders. Sign in with a customer account to order.
                </p>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={unavailableLines.length > 0 || !preview?.canCheckout}
                  onClick={() => navigate('/checkout')}
                >
                  Continue to checkout
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearCart()
          setConfirmClear(false)
        }}
        title="Clear your order?"
        message="This removes every dish you've selected. You can't undo it."
        confirmLabel="Clear order"
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
