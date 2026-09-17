import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '../../services'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
import { useAuth } from '../../hooks'
import { getErrorMessage, getFieldErrors } from '../../lib/apiClient'
import { formatDate, initials } from '../../lib/format'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name.').max(120),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number.')
    .optional()
    .or(z.literal('')),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  })

export function ProfilePage() {
  const { user, updateUser } = useAuth()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-forest-800 text-lg font-bold text-white">
          {initials(user?.fullName)}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{user?.fullName}</h1>
          <p className="text-sm text-ink-500">
            {user?.email} · {user?.role} since {formatDate(user?.createdAt)}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <ProfileForm user={user} onUpdated={updateUser} />
        <PasswordForm />
      </div>
    </div>
  )
}

function ProfileForm({ user, onUpdated }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', phoneNumber: user?.phoneNumber ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (values) =>
      authApi.updateProfile({
        fullName: values.fullName,
        phoneNumber: values.phoneNumber?.trim() || null,
      }),
    onSuccess: (updated) => {
      onUpdated(updated)
      toast.success('Profile updated')
    },
    onError: (error) => {
      applyFieldErrors(error, setError)
      toast.error(getErrorMessage(error))
    },
  })

  return (
    <Card>
      <CardHeader title="Personal details" description="Used on your orders and for delivery." />
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4 p-5" noValidate>
        <Input label="Full name" required error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label="Phone number"
          type="tel"
          hint="Optional, but we need it for delivery orders."
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
        <Input label="Email" value={user?.email ?? ''} disabled hint="Your email can't be changed." />

        <div className="flex justify-end">
          <Button type="submit" isLoading={mutation.isPending} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  )
}

function PasswordForm() {
  const [succeeded, setSucceeded] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const mutation = useMutation({
    mutationFn: (values) =>
      authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      reset()
      setSucceeded(true)
      toast.success('Password changed. Other devices have been signed out.')
    },
    onError: (error) => {
      applyFieldErrors(error, setError)
      toast.error(getErrorMessage(error))
    },
  })

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Changing it signs you out everywhere else."
      />
      <form
        onSubmit={handleSubmit((values) => {
          setSucceeded(false)
          mutation.mutate(values)
        })}
        className="space-y-4 p-5"
        noValidate
      >
        <Input
          label="Current password"
          type="password"
          required
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="flex items-center justify-end gap-3">
          {succeeded && <p className="text-sm font-medium text-emerald-700">Password updated</p>}
          <Button type="submit" isLoading={mutation.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  )
}

function applyFieldErrors(error, setError) {
  const fieldErrors = getFieldErrors(error)
  if (!fieldErrors) return

  Object.entries(fieldErrors).forEach(([field, messages]) =>
    setError(field, { type: 'server', message: messages[0] }),
  )
}
