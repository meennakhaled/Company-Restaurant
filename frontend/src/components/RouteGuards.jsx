import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../hooks'
import { LoadingState } from './ui/States'
import { Button } from './ui/Button'
import { ROLES } from '../lib/constants'

/**
 * Client-side route guards.
 *
 * These are a usability layer, not a security boundary — every endpoint is independently
 * authorized on the server. Their job is to stop users landing on a screen that would
 * only ever return 403.
 */
export function RequireAuth({ roles }) {
  const { isAuthenticated, role, isRestoring } = useAuth()
  const location = useLocation()

  // Wait for session restoration, or a page refresh would bounce a signed-in user to /login.
  if (isRestoring) return <LoadingState label="Checking your session…" />

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(role)) {
    return <AccessDenied role={role} />
  }

  return <Outlet />
}

/** Signed-in users have no reason to see the login or register screens. */
export function RedirectIfAuthenticated() {
  const { isAuthenticated, isStaffOrAdmin, isRestoring } = useAuth()

  if (isRestoring) return <LoadingState />
  if (isAuthenticated) return <Navigate to={isStaffOrAdmin ? '/app' : '/'} replace />

  return <Outlet />
}

function AccessDenied({ role }) {
  const homeFor = role === ROLES.CUSTOMER ? '/' : '/app'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900">Not available for your role</h1>
        <p className="mt-1 max-w-md text-sm text-ink-500">
          You're signed in as <span className="font-semibold text-ink-700">{role}</span>, which
          doesn't have access to this area.
        </p>
      </div>
      <Link to={homeFor}>
        <Button>Go back</Button>
      </Link>
    </div>
  )
}

/**
 * Sends signed-in staff to the dashboard and everyone else to the storefront. Used for
 * the /app index so each role lands somewhere useful.
 */
export function RoleHomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={role === ROLES.ADMIN ? '/app' : '/app/kitchen'} replace />
}
