import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bike, ShoppingBag, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { orderApi } from '../../services'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, Textarea } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/States'
import { useAuth, useCart } from '../../hooks'
import { formatCurrency } from '../../lib/format'
import { getErrorMessage, getFieldErrors } from '../../lib/apiClient'

const ORDER_TYPES = [
  { value: 'DineIn', label: 'Dine in', icon: Utensils, hint: "We'll bring it to your table" },
  { value: 'Takeaway', label: 'Takeaway', icon: ShoppingBag, hint: 'Collect at the counter' },
  { value: 'Delivery', label: 'Delivery', icon: Bike, hint: 'Straight to your door' },
]

/**
 * Validation mirrors the server's rules so the customer gets instant feedback, but the
 * server re-validates everything — this schema is a convenience, not the enforcement point.
 */
const checkoutSchema = z
  .object({
    type: z.enum(['DineIn', 'Takeaway', 'Delivery']),
    tableNumber: z.string().max(20).optional().or(z.literal('')),
    deliveryAddress: z.string().max(300).optional().or(z.literal('')),
    contactPhone: z.string().max(30).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'DineIn' && !values.tableNumber?.trim()) {
      ctx.addIssue({ path: ['tableNumber'], code: 'custom', message: 'Which table are you at?' })
    }
    if (values.type === 'Delivery') {
      if (!values.deliveryAddress?.trim()) {
        ctx.addIssue({ path: ['deliveryAddress'], code: 'custom', message: 'A delivery address is required.' })
      }
      if (!values.contactPhone?.trim()) {
        ctx.addIssue({ path: ['contactPhone'], code: 'custom', message: 'We need a phone number for delivery.' })
      }
    }
  })

export function CheckoutPage() {
  const { items, isEmpty, toOrderPayload, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      type: 'DineIn',
      tableNumber: '',
      deliveryAddress: '',
      contactPhone: user?.phoneNumber ?? '',
      notes: '',
    },
  })

  const orderType = watch('type')

  useEffect(() => {
    if (isEmpty) navigate('/cart', { replace: true })
  }, [isEmpty, navigate])

  // Re-priced whenever the order type changes, because delivery adds a fee.
  const { data: preview, isFetching: isPricing } = useQuery({
    queryKey: ['checkout-preview', orderType, items.map((i) => `${i.menuItemId}x${i.quantity}`).join('|')],
    queryFn: () => orderApi.preview({ type: orderType, items: toOrderPayload() }),
    enabled: !isEmpty,
  })

  const placeOrder = useMutation({
    mutationFn: (values) =>
      orderApi.place({
        type: values.type,
        tableNumber: values.tableNumber?.trim() || null,
        deliveryAddress: values.deliveryAddress?.trim() || null,
        contactPhone: values.contactPhone?.trim() || null,
        notes: values.notes?.trim() || null,
        items: toOrderPayload(),
      }),
    onSuccess: (order) => {
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      toast.success(`Order ${order.orderNumber} sent to the kitchen`)
      navigate(`/my/orders/${order.id}`, { replace: true })
    },
    onError: (error) => {
      // Field-level failures land on the matching input; anything else becomes a banner.
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          setError(field, { type: 'server', message: messages[0] })
        })
      }
      setServerError(getErrorMessage(error))
    },
  })

  if (isEmpty) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Checkout</h1>
      <p className="mt-1 text-sm text-ink-500">
        Signed in as <span className="font-medium text-ink-700">{user?.email}</span>
      </p>

      <form
        onSubmit={handleSubmit((values) => {
          setServerError(null)
          placeOrder.mutate(values)
        })}
        className="mt-7 grid gap-6 lg:grid-cols-[1fr_22rem]"
      >
        <div className="space-y-6">
          <Card>
            <div className="border-b border-ink-200/70 p-5">
              <h2 className="font-semibold text-ink-900">How would you like it?</h2>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {ORDER_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('type', option.value, { shouldValidate: true })}
                  aria-pressed={orderType === option.value}
                  className={clsx(
                    'flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors',
                    orderType === option.value
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                  )}
                >
                  <option.icon
                    className={clsx(
                      'size-5',
                      orderType === option.value ? 'text-brand-600' : 'text-ink-400',
                    )}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-ink-900">{option.label}</span>
                  <span className="text-xs text-ink-500">{option.hint}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="border-b border-ink-200/70 p-5">
              <h2 className="font-semibold text-ink-900">
                {orderType === 'Delivery' ? 'Delivery details' : 'Order details'}
              </h2>
            </div>
            <div className="space-y-4 p-5">
              {orderType === 'DineIn' && (
                <Input
                  label="Table number"
                  required
                  placeholder="e.g. T12"
                  error={errors.tableNumber?.message}
                  {...register('tableNumber')}
                />
              )}

              {orderType === 'Delivery' && (
                <>
                  <Textarea
                    label="Delivery address"
                    required
                    rows={2}
                    placeholder="Street, building, apartment, any landmark"
                    error={errors.deliveryAddress?.message}
                    {...register('deliveryAddress')}
                  />
                  <Input
                    label="Contact phone"
                    required
                    type="tel"
                    placeholder="+1 555 0100"
                    error={errors.contactPhone?.message}
                    {...register('contactPhone')}
                  />
                </>
              )}

              {orderType === 'Takeaway' && (
                <Input
                  label="Contact phone"
                  type="tel"
                  hint="Optional — so we can call you when it's ready."
                  placeholder="+1 555 0100"
                  error={errors.contactPhone?.message}
                  {...register('contactPhone')}
                />
              )}

              <Textarea
                label="Notes for the kitchen"
                rows={3}
                placeholder="Allergies, preferences, anything we should know"
                error={errors.notes?.message}
                {...register('notes')}
              />
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="border-b border-ink-200/70 p-5">
              <h2 className="font-semibold text-ink-900">Your order</h2>
            </div>

            <ul className="divide-y divide-ink-200/70">
              {(preview?.lines ?? []).map((line) => (
                <li key={line.menuItemId} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-ink-900">
                      {line.quantity}× {line.itemName}
                    </span>
                    {!line.isAvailable && (
                      <span className="block text-xs font-medium text-rose-600">
                        {line.unavailableReason}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-ink-900">
                    {formatCurrency(line.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-ink-200/70 p-5 text-sm">
              {isPricing && !preview ? (
                <div className="flex justify-center py-3">
                  <Spinner />
                </div>
              ) : preview ? (
                <>
                  <Row label="Subtotal" value={formatCurrency(preview.subtotal)} />
                  <Row label="Tax" value={formatCurrency(preview.taxAmount)} />
                  <Row
                    label="Delivery"
                    value={preview.deliveryFee > 0 ? formatCurrency(preview.deliveryFee) : 'Free'}
                  />
                  <div className="flex items-baseline justify-between border-t border-ink-200/70 pt-3">
                    <span className="font-semibold text-ink-900">Total</span>
                    <span className="text-xl font-semibold text-ink-900">
                      {formatCurrency(preview.totalAmount)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {serverError && (
              <p className="mx-5 mb-3 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
                {serverError}
              </p>
            )}

            <div className="border-t border-ink-200/70 p-5">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={placeOrder.isPending}
                disabled={!preview?.canCheckout || isPricing}
              >
                Place order
              </Button>
              <Link to="/cart" className="mt-2 block">
                <Button variant="ghost" className="w-full">
                  Back to order
                </Button>
              </Link>
              <p className="mt-3 text-center text-xs text-ink-500">
                Payment is taken at the restaurant or on delivery.
              </p>
            </div>
          </Card>
        </div>
      </form>
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
