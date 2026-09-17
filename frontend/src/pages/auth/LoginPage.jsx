import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { useAuth } from '../../hooks'
import { getErrorMessage } from '../../lib/apiClient'
import { ROLES } from '../../lib/constants'

const schema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

/** Demo accounts, so a reviewer can get into each role without reading the README. */
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@restaurant.com', password: 'Admin@123' },
  { label: 'Chef', email: 'chef@restaurant.com', password: 'Chef@1234' },
  { label: 'Customer', email: 'customer@restaurant.com', password: 'Customer@123' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (values) => {
    setServerError(null)
    try {
      const session = await login(values)
      toast.success(`Welcome back, ${session.user.fullName.split(' ')[0]}`)

      // Return them where they were headed, or to the right home for their role.
      const target =
        location.state?.from?.pathname ??
        (session.user.role === ROLES.CUSTOMER ? '/menu' : '/app')

      navigate(target, { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error))
    }
  }

  const fillDemo = (account) => {
    setValue('email', account.email)
    setValue('password', account.password)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to place orders and follow them in real time."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-ink-200 bg-ink-50 p-4">
        <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Demo accounts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-ink-200 ring-inset transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}

/** Shared split-screen shell for sign in and registration. */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-forest-900 lg:block">
        <img
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=70"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-30"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ChefHat className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-semibold text-white">Saffron &amp; Sage</span>
          </Link>

          <blockquote className="max-w-md">
            <p className="font-display text-2xl leading-snug text-white">
              "We write the menu every morning around what's good that day. Ordering should be
              just as straightforward."
            </p>
            <footer className="mt-4 text-sm text-ink-300">Marco — Head Chef</footer>
          </blockquote>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ChefHat className="size-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold">Saffron &amp; Sage</span>
          </Link>

          <h1 className="font-display text-3xl font-semibold text-ink-900">{title}</h1>
          <p className="mt-1.5 mb-7 text-sm text-ink-500">{subtitle}</p>

          {children}
        </div>
      </div>
    </div>
  )
}
