import { createContext } from 'react'

/**
 * Context objects live apart from their providers so each provider file exports only
 * components. That keeps Vite's fast refresh working across edits to either side.
 */
export const AuthContext = createContext(null)

export const CartContext = createContext(null)
