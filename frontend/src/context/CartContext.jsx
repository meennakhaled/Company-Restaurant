import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CartContext } from './contexts'

const STORAGE_KEY = 'restaurant.cart'
const MAX_PER_ITEM = 20

/**
 * The cart lives in the browser, not the database.
 *
 * A restaurant cart is short-lived and personal, and keeping it client-side means browsing
 * and adding items costs zero API calls. What matters is that the client never decides money:
 * prices shown here are only a preview, and checkout re-prices everything server-side against
 * the live menu (see /api/orders/preview and /api/orders).
 *
 * Stored per service date, so a cart left open overnight does not carry yesterday's dishes
 * into today's menu.
 */
function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { date: null, items: [] }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.items) ? parsed : { date: null, items: [] }
  } catch {
    return { date: null, items: [] }
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readStoredCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  const items = cart.items

  const addItem = useCallback((menuItem, quantity = 1) => {
    setCart((current) => {
      const existing = current.items.find((item) => item.menuItemId === menuItem.id)
      const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, MAX_PER_ITEM)

      if (existing && existing.quantity === nextQuantity) {
        toast.info(`You already have the maximum of ${MAX_PER_ITEM}.`)
        return current
      }

      toast.success(existing ? `${menuItem.name} updated in your order` : `${menuItem.name} added`)

      const line = {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl,
        categoryName: menuItem.categoryName,
        quantity: nextQuantity,
        notes: existing?.notes ?? '',
      }

      return {
        date: current.date,
        items: existing
          ? current.items.map((item) => (item.menuItemId === menuItem.id ? line : item))
          : [...current.items, line],
      }
    })
  }, [])

  const updateQuantity = useCallback((menuItemId, quantity) => {
    setCart((current) => ({
      ...current,
      items:
        quantity <= 0
          ? current.items.filter((item) => item.menuItemId !== menuItemId)
          : current.items.map((item) =>
              item.menuItemId === menuItemId
                ? { ...item, quantity: Math.min(quantity, MAX_PER_ITEM) }
                : item,
            ),
    }))
  }, [])

  const updateNotes = useCallback((menuItemId, notes) => {
    setCart((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.menuItemId === menuItemId ? { ...item, notes } : item,
      ),
    }))
  }, [])

  const removeItem = useCallback((menuItemId) => {
    setCart((current) => ({
      ...current,
      items: current.items.filter((item) => item.menuItemId !== menuItemId),
    }))
  }, [])

  const clearCart = useCallback(() => setCart({ date: null, items: [] }), [])

  /** Called by the menu page: a new service date invalidates yesterday's cart. */
  const syncServiceDate = useCallback((serviceDate) => {
    setCart((current) => {
      if (!serviceDate || current.date === serviceDate) return current
      if (current.items.length === 0) return { date: serviceDate, items: [] }

      toast.info("Today's menu has changed, so your previous cart was cleared.")
      return { date: serviceDate, items: [] }
    })
  }, [])

  const value = useMemo(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0)
    const estimatedSubtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

    return {
      items,
      itemCount,
      estimatedSubtotal,
      isEmpty: items.length === 0,
      // Shape the order endpoints expect: ids and quantities only, never prices.
      toOrderPayload: () =>
        items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes?.trim() || null,
        })),
      quantityOf: (menuItemId) => items.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0,
      addItem,
      updateQuantity,
      updateNotes,
      removeItem,
      clearCart,
      syncServiceDate,
    }
  }, [items, addItem, updateQuantity, updateNotes, removeItem, clearCart, syncServiceDate])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
