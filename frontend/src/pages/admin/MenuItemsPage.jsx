import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Salad, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categoryApi, menuItemApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Badge, Card } from '../../components/ui/Card'
import { Input, Select, Textarea, Toggle } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { DataTable, Pagination } from '../../components/ui/DataTable'
import { DishImage } from '../../components/ui/DishImage'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { useDebounced } from '../../hooks'
import { formatCurrency } from '../../lib/format'
import { getErrorMessage, getFieldErrors } from '../../lib/apiClient'
import { AVAILABILITY_META } from '../../lib/constants'

const PAGE_SIZE = 10

const schema = z.object({
  name: z.string().min(1, 'A name is required.').max(120),
  description: z.string().max(1000).optional().or(z.literal('')),
  price: z.coerce
    .number({ message: 'Enter a price.' })
    .positive('Price must be greater than 0.')
    .max(10000, 'That price looks too high.'),
  imageUrl: z.string().max(500).optional().or(z.literal('')),
  categoryId: z.coerce.number().int().positive('Choose a category.'),
  preparationMinutes: z.coerce
    .number({ message: 'Enter a preparation time.' })
    .int()
    .min(1, 'At least 1 minute.')
    .max(240, 'At most 240 minutes.'),
  availability: z.enum(['Everyday', 'DailySpecial']),
  isAvailable: z.boolean(),
  isVegetarian: z.boolean(),
  isSpicy: z.boolean(),
})

export function MenuItemsPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [availability, setAvailability] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const debouncedSearch = useDebounced(search)
  const queryClient = useQueryClient()

  useEffect(() => setPage(1), [debouncedSearch, categoryId, availability])

  const { data: categories } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => categoryApi.list(true),
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['menu-items', { debouncedSearch, categoryId, availability, page }],
    queryFn: () =>
      menuItemApi.search({
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        availability: availability || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['menu-items'] })
    queryClient.invalidateQueries({ queryKey: ['menu'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }) => menuItemApi.setAvailability(id, isAvailable),
    onSuccess: (item) => {
      invalidate()
      toast.success(`${item.name} is now ${item.isAvailable ? 'available' : 'hidden'}`)
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  })

  const removeItem = useMutation({
    mutationFn: (id) => menuItemApi.remove(id),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success('Dish archived')
    },
    onError: (mutationError) => {
      setDeleting(null)
      toast.error(getErrorMessage(mutationError))
    },
  })

  const columns = [
    {
      key: 'name',
      header: 'Dish',
      render: (item) => (
        <div className="flex items-center gap-3">
          <DishImage src={item.imageUrl} alt={item.name} className="size-11 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{item.name}</p>
            <p className="truncate text-xs text-ink-500">{item.categoryName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (item) => <span className="font-medium text-ink-900">{formatCurrency(item.price)}</span>,
    },
    {
      key: 'availability',
      header: 'Planned as',
      render: (item) => (
        <Badge tone={item.availability === 'DailySpecial' ? 'brand' : 'neutral'}>
          {AVAILABILITY_META[item.availability]?.label ?? item.availability}
        </Badge>
      ),
    },
    {
      key: 'preparationMinutes',
      header: 'Prep',
      render: (item) => <span className="text-ink-600">{item.preparationMinutes} min</span>,
    },
    {
      key: 'isAvailable',
      header: 'Visible',
      render: (item) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Toggle
            checked={item.isAvailable}
            onChange={(checked) => toggleAvailability.mutate({ id: item.id, isAvailable: checked })}
            label={item.isAvailable ? 'Yes' : 'No'}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-ink-400 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => setDeleting(item)}
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Menu items"
        description="Your full catalogue — every dish the kitchen can cook. A dish only goes on sale once it's scheduled onto a day in the planner."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus className="size-4" aria-hidden="true" />
            New dish
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
              placeholder="Search dishes…"
              aria-label="Search dishes"
              className="w-full rounded-lg border border-ink-200 py-2.5 pr-3 pl-9 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>

          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            aria-label="Filter by how the dish is planned"
          >
            <option value="">Staples and specials</option>
            <option value="Everyday">Staples only</option>
            <option value="DailySpecial">Chef's specials only</option>
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
                <EmptyState
                  icon={Salad}
                  title="No dishes found"
                  message="Add your first dish, or adjust the filters."
                  action={
                    <Button onClick={() => setEditing({})}>
                      <Plus className="size-4" aria-hidden="true" />
                      New dish
                    </Button>
                  }
                />
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

      <MenuItemFormModal
        item={editing}
        categories={categories ?? []}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeItem.mutate(deleting.id)}
        isLoading={removeItem.isPending}
        title={`Delete ${deleting?.name}?`}
        message="The dish is archived and disappears from every menu and future schedule. Past orders keep it, so your reports stay accurate."
        confirmLabel="Delete dish"
      />
    </>
  )
}

function MenuItemFormModal({ item, categories, onClose, onSaved }) {
  const isOpen = item !== null
  const isEdit = Boolean(item?.id)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  // Re-seed whenever a different dish is opened.
  useEffect(() => {
    if (!isOpen) return
    reset({
      name: item.name ?? '',
      description: item.description ?? '',
      price: item.price ?? '',
      imageUrl: item.imageUrl ?? '',
      categoryId: item.categoryId ?? categories[0]?.id ?? '',
      preparationMinutes: item.preparationMinutes ?? 15,
      availability: item.availability ?? 'Everyday',
      isAvailable: item.isAvailable ?? true,
      isVegetarian: item.isVegetarian ?? false,
      isSpicy: item.isSpicy ?? false,
    })
  }, [isOpen, item, categories, reset])

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        description: values.description?.trim() || null,
        imageUrl: values.imageUrl?.trim() || null,
      }
      return isEdit ? menuItemApi.update(item.id, payload) : menuItemApi.create(payload)
    },
    onSuccess: (saved) => {
      onSaved()
      onClose()
      toast.success(isEdit ? `${saved.name} updated` : `${saved.name} added to the catalogue`)
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) =>
          setError(field, { type: 'server', message: messages[0] }),
        )
      } else if (error?.response?.status === 409) {
        setError('name', { type: 'server', message: getErrorMessage(error) })
      }
      toast.error(getErrorMessage(error))
    },
  })

  const availability = watch('availability')
  const imageUrl = watch('imageUrl')

  if (!isOpen) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${item.name}` : 'New dish'}
      description="Prices and availability apply everywhere this dish appears."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((values) => mutation.mutate(values))}
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create dish'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Input label="Dish name" required error={errors.name?.message} {...register('name')} />

        <Textarea
          label="Description"
          rows={3}
          placeholder="What's in it, how it's cooked, what it comes with."
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            required
            error={errors.price?.message}
            {...register('price')}
          />
          <Select label="Category" required error={errors.categoryId?.message} {...register('categoryId')}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input
            label="Prep time (min)"
            type="number"
            min="1"
            max="240"
            required
            error={errors.preparationMinutes?.message}
            {...register('preparationMinutes')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Input
            label="Image URL"
            placeholder="https://…"
            hint="Optional. A branded placeholder is shown if this is empty or broken."
            error={errors.imageUrl?.message}
            {...register('imageUrl')}
          />
          <div className="self-end">
            <DishImage src={imageUrl} alt="Preview" className="size-20 rounded-lg" />
          </div>
        </div>

        <Select
          label="How it's planned"
          required
          hint={AVAILABILITY_META[availability]?.hint}
          error={errors.availability?.message}
          {...register('availability')}
        >
          <option value="Everyday">Everyday staple — part of the regular menu</option>
          <option value="DailySpecial">Chef's special — picked for particular days</option>
        </Select>

        <div className="grid gap-3 rounded-lg bg-ink-50 p-4 sm:grid-cols-3">
          <Toggle
            checked={watch('isAvailable')}
            onChange={(checked) => setValue('isAvailable', checked, { shouldDirty: true })}
            label="Available"
            description="Master switch"
          />
          <Toggle
            checked={watch('isVegetarian')}
            onChange={(checked) => setValue('isVegetarian', checked, { shouldDirty: true })}
            label="Vegetarian"
          />
          <Toggle
            checked={watch('isSpicy')}
            onChange={(checked) => setValue('isSpicy', checked, { shouldDirty: true })}
            label="Spicy"
          />
        </div>
      </form>
    </Modal>
  )
}
