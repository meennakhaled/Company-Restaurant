import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth, useCart } from '../../hooks'
import { Button } from '../ui/Button'
import { initials } from '../../lib/format'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: "Today's menu" },
  { to: '/about', label: 'Our story' },
]

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, user, isStaffOrAdmin, isCustomer, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    setMobileOpen(false)
    navigate('/')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ChefHat className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg leading-none font-semibold text-ink-900">
              Saffron <span className="text-brand-600">&amp;</span> Sage
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/cart"
              className="relative inline-flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100"
              aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="hidden items-center gap-2 md:flex">
                {isStaffOrAdmin && (
                  <Button variant="secondary" size="sm" onClick={() => navigate('/app')}>
                    <LayoutDashboard className="size-4" aria-hidden="true" />
                    Dashboard
                  </Button>
                )}
                {isCustomer && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/my/orders')}>
                    <ClipboardList className="size-4" aria-hidden="true" />
                    My orders
                  </Button>
                )}
                <Link
                  to="/my/profile"
                  className="flex size-9 items-center justify-center rounded-full bg-forest-800 text-xs font-bold text-white"
                  title={user?.fullName}
                >
                  {initials(user?.fullName)}
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Create account
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="inline-flex size-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="animate-fade-in-up border-t border-ink-200/70 bg-white px-4 py-3 md:hidden">
            <nav className="grid gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="my-2 h-px bg-ink-200" />

              {isAuthenticated ? (
                <>
                  {isStaffOrAdmin && (
                    <MobileLink to="/app" icon={LayoutDashboard} onNavigate={() => setMobileOpen(false)}>
                      Dashboard
                    </MobileLink>
                  )}
                  <MobileLink to="/my/orders" icon={ClipboardList} onNavigate={() => setMobileOpen(false)}>
                    My orders
                  </MobileLink>
                  <MobileLink to="/my/profile" icon={User} onNavigate={() => setMobileOpen(false)}>
                    Profile
                  </MobileLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              ) : (
                <div className="grid gap-2 pt-1">
                  <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate('/login') }}>
                    Sign in
                  </Button>
                  <Button onClick={() => { setMobileOpen(false); navigate('/register') }}>
                    Create account
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}

function MobileLink({ to, icon: Icon, children, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200/70 bg-forest-900 text-ink-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ChefHat className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold text-white">Saffron &amp; Sage</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-ink-300">
            A kitchen that cooks what's good today. Our chefs plan a fresh selection every
            morning, so the menu you see is the food we actually have.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Opening hours</h3>
          <dl className="mt-3 space-y-1.5 text-sm text-ink-300">
            <div className="flex justify-between gap-4">
              <dt>Monday – Thursday</dt>
              <dd>11:00 – 22:00</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Friday – Saturday</dt>
              <dd>11:00 – 23:30</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Sunday</dt>
              <dd>12:00 – 21:00</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Find us</h3>
          <address className="mt-3 space-y-1.5 text-sm text-ink-300 not-italic">
            <p>18 Orchard Lane, Riverside</p>
            <p>
              <a href="tel:+15550100" className="hover:text-brand-300">
                +1 555 0100
              </a>
            </p>
            <p>
              <a href="mailto:hello@saffronandsage.test" className="hover:text-brand-300">
                hello@saffronandsage.test
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Saffron &amp; Sage — a portfolio project.
      </div>
    </footer>
  )
}
