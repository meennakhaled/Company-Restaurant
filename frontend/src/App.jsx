import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { PublicLayout } from './components/layout/PublicLayout'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { RedirectIfAuthenticated, RequireAuth } from './components/RouteGuards'
import { useAuth } from './hooks'
import { ROLES } from './lib/constants'

import { HomePage } from './pages/public/HomePage'
import { MenuPage } from './pages/public/MenuPage'
import { MenuItemPage } from './pages/public/MenuItemPage'
import { AboutPage } from './pages/public/AboutPage'
import { CartPage } from './pages/public/CartPage'
import { CheckoutPage } from './pages/public/CheckoutPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { MyOrdersPage } from './pages/customer/MyOrdersPage'
import { OrderDetailsPage } from './pages/customer/OrderDetailsPage'
import { ProfilePage } from './pages/customer/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

// The staff workspace is lazy-loaded: it pulls in the charting library and the SignalR
// client, neither of which a customer browsing the menu should have to download.
const KitchenBoardPage = lazy(() =>
  import('./pages/staff/KitchenBoardPage').then((m) => ({ default: m.KitchenBoardPage })),
)
const OrdersPage = lazy(() =>
  import('./pages/staff/OrdersPage').then((m) => ({ default: m.OrdersPage })),
)
const DailyMenuPlannerPage = lazy(() =>
  import('./pages/staff/DailyMenuPlannerPage').then((m) => ({ default: m.DailyMenuPlannerPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const MenuItemsPage = lazy(() =>
  import('./pages/admin/MenuItemsPage').then((m) => ({ default: m.MenuItemsPage })),
)
const CategoriesPage = lazy(() =>
  import('./pages/admin/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
)
const UsersPage = lazy(() =>
  import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Menus and orders change often enough that a long cache would show stale prices.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Auth and permission failures will never succeed on retry.
        const status = error?.response?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
  },
})

const STAFF_AND_ADMIN = [ROLES.STAFF, ROLES.ADMIN]

/** /app resolves to the dashboard for admins and the kitchen board for staff. */
function DashboardHome() {
  const { isAdmin } = useAuth()
  return isAdmin ? <DashboardPage /> : <Navigate to="/app/kitchen" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Auth screens use their own full-page layout. */}
              <Route element={<RedirectIfAuthenticated />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Storefront. Browsing the menu deliberately does not require an account. */}
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="menu/:id" element={<MenuItemPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="cart" element={<CartPage />} />

                {/* Ordering and order history require a signed-in customer. */}
                <Route element={<RequireAuth roles={[ROLES.CUSTOMER]} />}>
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="my/orders" element={<MyOrdersPage />} />
                  <Route path="my/orders/:id" element={<OrderDetailsPage />} />
                </Route>

                {/* Any signed-in user can manage their own profile. */}
                <Route element={<RequireAuth />}>
                  <Route path="my/profile" element={<ProfilePage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Staff and admin workspace. */}
              <Route element={<RequireAuth roles={STAFF_AND_ADMIN} />}>
                <Route path="/app" element={<DashboardLayout />}>
                  {/* Admins land on the dashboard; staff have no use for it, so they
                      go straight to the board they actually work from. */}
                  <Route index element={<DashboardHome />} />

                  <Route element={<RequireAuth roles={[ROLES.ADMIN]} />}>
                    <Route path="menu-items" element={<MenuItemsPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="users" element={<UsersPage />} />
                  </Route>

                  <Route path="kitchen" element={<KitchenBoardPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="planner" element={<DailyMenuPlannerPage />} />

                  <Route path="*" element={<Navigate to="/app/kitchen" replace />} />
                </Route>
              </Route>
            </Routes>

            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{ duration: 4000 }}
            />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
