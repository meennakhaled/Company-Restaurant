import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setSessionExpiredHandler, tokenStorage } from '../lib/apiClient'
import { authApi } from '../services'
import { ROLES } from '../lib/constants'
import { AuthContext } from './contexts'

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(() => tokenStorage.read())
  // Blocks the first render of guarded routes until we know whether the stored token
  // is still good — otherwise a refresh briefly bounces the user to /login.
  const [isRestoring, setIsRestoring] = useState(() => Boolean(tokenStorage.read()))

  const clearSession = useCallback(() => {
    tokenStorage.clear()
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionExpiredHandler(clearSession)
  }, [clearSession])

  // Re-validates the stored token on boot and picks up profile/role changes made
  // by an admin while the user was away.
  useEffect(() => {
    if (!session?.accessToken) {
      setIsRestoring(false)
      return
    }

    let cancelled = false

    authApi
      .me()
      .then((user) => {
        if (cancelled) return
        setSession((current) => {
          if (!current) return current
          const next = { ...current, user }
          tokenStorage.write(next)
          return next
        })
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })

    return () => {
      cancelled = true
    }
    // Runs once on mount: this is session restoration, not a subscription to session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applySession = useCallback((data) => {
    tokenStorage.write(data)
    setSession(data)
    return data
  }, [])

  const login = useCallback(
    async (credentials) => applySession(await authApi.login(credentials)),
    [applySession],
  )

  const register = useCallback(
    async (payload) => applySession(await authApi.register(payload)),
    [applySession],
  )

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.read()?.refreshToken
    // Best-effort revoke; the local session is cleared either way so the user is
    // never stuck "signed in" because the network hiccuped.
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        /* ignored on purpose */
      }
    }
    clearSession()
  }, [clearSession])

  const updateUser = useCallback((user) => {
    setSession((current) => {
      if (!current) return current
      const next = { ...current, user }
      tokenStorage.write(next)
      return next
    })
  }, [])

  const value = useMemo(() => {
    const user = session?.user ?? null
    return {
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isCustomer: user?.role === ROLES.CUSTOMER,
      isStaff: user?.role === ROLES.STAFF,
      isAdmin: user?.role === ROLES.ADMIN,
      isStaffOrAdmin: user?.role === ROLES.STAFF || user?.role === ROLES.ADMIN,
      isRestoring,
      login,
      register,
      logout,
      updateUser,
    }
  }, [session, isRestoring, login, register, logout, updateUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
