import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { userApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Badge, Card } from '../../components/ui/Card'
import { Input, Select, Toggle } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { DataTable, Pagination } from '../../components/ui/DataTable'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useAuth, useDebounced } from '../../hooks'
import { formatCurrency, formatDate, formatRelative, initials } from '../../lib/format'
import { getErrorMessage, getFieldErrors } from '../../lib/apiClient'
import { ROLES } from '../../lib/constants'

const PAGE_SIZE = 10

const staffSchema = z.object({
  fullName: z.string().min(2, 'Enter their full name.').max(120),
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
  role: z.enum(['Staff', 'Admin']),
})

const ROLE_TONES = { Admin: 'brand', Staff: 'info', Customer: 'neutral' }

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null)

  const debouncedSearch = useDebounced(search)
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()

  useEffect(() => setPage(1), [debouncedSearch, role, isActive])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users', { debouncedSearch, role, isActive, page }],
    queryFn: () =>
      userApi.search({
        search: debouncedSearch || undefined,
        role: role || undefined,
        isActive: isActive === '' ? undefined : isActive === 'true',
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const updateRole = useMutation({
    mutationFn: ({ id, role: nextRole }) => userApi.updateRole(id, nextRole),
    onSuccess: (user) => {
      invalidate()
      toast.success(`${user.fullName} is now ${user.role}`)
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, isActive: nextActive }) => userApi.updateStatus(id, nextActive),
    onSuccess: (user) => {
      invalidate()
      setStatusTarget(null)
      toast.success(
        user.isActive
          ? `${user.fullName} can sign in again`
          : `${user.fullName} has been deactivated and signed out`,
      )
    },
    onError: (mutationError) => {
      setStatusTarget(null)
      toast.error(getErrorMessage(mutationError))
    },
  })

  const columns = [
    {
      key: 'fullName',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest-800 text-xs font-bold text-white">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">
              {user.fullName}
              {user.id === currentUser?.id && (
                <span className="ml-1.5 text-xs font-normal text-ink-400">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <div onClick={(event) => event.stopPropagation()}>
          {user.id === currentUser?.id ? (
            <Badge tone={ROLE_TONES[user.role]}>{user.role}</Badge>
          ) : (
            <Select
              value={user.role}
              onChange={(event) => updateRole.mutate({ id: user.id, role: event.target.value })}
              aria-label={`Role for ${user.fullName}`}
              className="w-32"
            >
              {Object.values(ROLES).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          )}
        </div>
      ),
    },
    {
      key: 'orderCount',
      header: 'Orders',
      render: (user) => (
        <div>
          <p className="font-medium text-ink-900">{user.orderCount}</p>
          {user.totalSpent > 0 && (
            <p className="text-xs text-ink-500">{formatCurrency(user.totalSpent)} spent</p>
          )}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last seen',
      render: (user) => (
        <span className="text-xs text-ink-500">
          {user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Never signed in'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user) => <span className="text-xs text-ink-500">{formatDate(user.createdAt)}</span>,
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (user) => (
        <div onClick={(event) => event.stopPropagation()}>
          {user.id === currentUser?.id ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Toggle
              checked={user.isActive}
              onChange={() => setStatusTarget(user)}
              label={user.isActive ? 'Active' : 'Disabled'}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users & staff"
        description="Everyone with an account. Customers register themselves; staff and admin accounts are created here."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" aria-hidden="true" />
            Add staff member
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email or phone…"
              aria-label="Search users"
              className="w-full rounded-lg border border-ink-200 py-2.5 pr-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>

          <Select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {Object.values(ROLES).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>

          <Select
            value={isActive}
            onChange={(event) => setIsActive(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">Active and disabled</option>
            <option value="true">Active only</option>
            <option value="false">Disabled only</option>
          </Select>
        </div>
      </Card>

      <Card>
        {isError ? (
          <div className="p-5">
            <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.items}
              isLoading={isLoading}
              emptyState={
                <EmptyState icon={Users} title="No users found" message="Try a different search or filter." />
              }
            />
            {data && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                totalCount={data.totalCount}
                pageSize={data.pageSize}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>

      <CreateStaffModal open={isCreateOpen} onClose={() => setCreateOpen(false)} onSaved={invalidate} />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          updateStatus.mutate({ id: statusTarget.id, isActive: !statusTarget.isActive })
        }
        isLoading={updateStatus.isPending}
        variant={statusTarget?.isActive ? 'danger' : 'primary'}
        title={statusTarget?.isActive ? `Deactivate ${statusTarget?.fullName}?` : `Reactivate ${statusTarget?.fullName}?`}
        message={
          statusTarget?.isActive
            ? 'They will be signed out immediately and cannot sign back in. Their order history is kept.'
            : 'They will be able to sign in again straight away.'
        }
        confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Reactivate'}
      />
    </>
  )
}

function CreateStaffModal({ open, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: { fullName: '', email: '', phoneNumber: '', password: '', role: 'Staff' },
  })

  const mutation = useMutation({
    mutationFn: (values) =>
      userApi.createStaff({ ...values, phoneNumber: values.phoneNumber?.trim() || null }),
    onSuccess: (user) => {
      onSaved()
      onClose()
      reset()
      toast.success(`${user.fullName} added as ${user.role}`)
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) =>
          setError(field, { type: 'server', message: messages[0] }),
        )
      } else if (error?.response?.status === 409) {
        setError('email', { type: 'server', message: getErrorMessage(error) })
      }
      toast.error(getErrorMessage(error))
    },
  })

  if (!open) return null

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a staff member"
      description="They can sign in immediately with the password you set here."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((values) => mutation.mutate(values))}
            isLoading={mutation.isPending}
          >
            Create account
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Input label="Full name" required error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Input
          label="Phone number"
          type="tel"
          hint="Optional."
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
        <Input
          label="Temporary password"
          type="password"
          required
          hint="At least 8 characters, with a letter and a number. Ask them to change it after signing in."
          error={errors.password?.message}
          {...register('password')}
        />
        <Select label="Role" required error={errors.role?.message} {...register('role')}>
          <option value="Staff">Staff — kitchen board and daily menu planner</option>
          <option value="Admin">Admin — full management access</option>
        </Select>

        <p className="flex gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
          <ShieldCheck className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
          Customers can only ever register themselves — the public sign-up form cannot create
          staff or admin accounts.
        </p>
      </form>
    </Modal>
  )
}
