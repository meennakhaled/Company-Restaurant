import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChefHat,
  ExternalLink,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu as MenuIcon,
  ReceiptText,
  Salad,
  Tags,
  Users,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../hooks'
import { LoadingState } from '../ui/States'
import { initials } from '../../lib/format'
import { ROLES } from '../../lib/constants'

/**
 * Sidebar shell for staff and admin.
 *
 * Nav items declare which roles may see them, so the menu can never offer a link that
 * would 403 — the route guards enforce the same rule server-side of the router.
 */
const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true, roles: [ROLES.ADMIN] },
      { to: '/app/kitchen', label: 'Kitchen board', icon: ChefHat, roles: [ROLES.STAFF, ROLES.ADMIN] },
      { to: '/app/orders', label: 'Orders', icon: ReceiptText, roles: [ROLES.STAFF, ROLES.ADMIN] },
      { to: '/app/planner', label: 'Daily menu planner', icon: CalendarDays, roles: [ROLES.STAFF, ROLES.ADMIN] },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/app/menu-items', label: 'Menu items', icon: Salad, roles: [ROLES.ADMIN] },
      { to: '/app/categories', label: 'Categories', icon: Tags, roles: [ROLES.ADMIN] },
      { to: '/app/users', label: 'Users & staff', icon: Users, roles: [ROLES.ADMIN] },
    ],
  },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Navigating on mobile should dismiss the drawer, not leave it covering the page.
  useEffect(() => setSidebarOpen(false), [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="min-h-dvh bg-ink-50 lg:flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-forest-900 text-ink-200 transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ChefHat className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-base leading-tight font-semibold text-white">
            Saffron &amp; Sage
            <span className="block text-[11px] font-sans font-medium tracking-wide text-ink-400 uppercase">
              {role === ROLES.ADMIN ? 'Management' : 'Kitchen'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-ink-300 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-ink-300 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <Link
            to="/"
            className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="size-4.5" aria-hidden="true" />
            View public site
          </Link>

          <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials(user?.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{user?.fullName}</span>
              <span className="block truncate text-xs text-ink-400">{role}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-ink-700 hover:bg-ink-100"
            aria-label="Open navigation"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="font-display text-base font-semibold">Saffron &amp; Sage</span>
          <ListOrdered className="ml-auto size-5 text-ink-400" aria-hidden="true" />
        </header>

        {/* The workspace pages are lazy-loaded, so the sidebar stays put while one arrives. */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

/** Page title block used at the top of every dashboard screen. */
export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={clsx('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
