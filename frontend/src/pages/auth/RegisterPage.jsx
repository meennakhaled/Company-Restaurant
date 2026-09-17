import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { useAuth } from '../../hooks'
import { getErrorMessage, getFieldErrors } from '../../lib/apiClient'
import { AuthShell } from './LoginPage'

// Mirrors the server's password policy so the rules are visible before submitting.
const schema = z
  .object({
    fullName: z.string().min(2, 'Please tell us your name.').max(120, 'That name is too long.'),
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    phoneNumber: z
      .string()
      .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number.')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  })

export function RegisterPage() {
  const { register: signUp } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values) => {
    setServerError(null)
    try {
      const session = await signUp({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phoneNumber: values.phoneNumber?.trim() || null,
      })

      toast.success(`Welcome, ${session.user.fullName.split(' ')[0]}!`)
      navigate('/menu', { replace: true })
    } catch (error) {
      // A duplicate email comes back as a 409 with no field map, so it lands on the email input.
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) =>
          setError(field, { type: 'server', message: messages[0] }),
        )
      } else if (error?.response?.status === 409) {
        setError('email', { type: 'server', message: getErrorMessage(error) })
      }

      setServerError(getErrorMessage(error))
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Order in a couple of taps and keep every receipt in one place."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full name"
          required
          autoComplete="name"
          placeholder="Emma Carter"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone number"
          type="tel"
          autoComplete="tel"
          hint="Optional — useful for delivery orders."
          placeholder="+1 555 0100"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
