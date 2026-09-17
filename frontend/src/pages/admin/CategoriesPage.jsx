import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categoryApi } from '../../services'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Badge, Card } from '../../components/ui/Card'
import { Input, Textarea, Toggle } from '../../components/ui/Field'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { DataTable } from '../../components/ui/DataTable'
import { DishImage } from '../../components/ui/DishImage'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { getErrorMessage, getFieldErrors } from '../../lib/apiClient'

const schema = z.object({
  name: z.string().min(1, 'A name is required.').max(80),
  description: z.string().max(500).optional().or(z.literal('')),
  imageUrl: z.string().max(500).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
})

export function CategoriesPage() {
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const queryClient = useQueryClient()

  const { data: categories, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => categoryApi.list(true),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['menu'] })
  }

  const removeCategory = useMutation({
    mutationFn: (id) => categoryApi.remove(id),
    onSuccess: () => {
      invalidate()
      setDeleting(null)
      toast.success('Category deleted')
    },
    onError: (mutationError) => {
      setDeleting(null)
      // A category with dishes returns 409 with an explanation the admin can act on.
      toast.error(getErrorMessage(mutationError))
    },
  })

  const columns = [
    {
      key: 'name',
      header: 'Category',
      render: (category) => (
        <div className="flex items-center gap-3">
          <DishImage src={category.imageUrl} alt={category.name} className="size-11 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{category.name}</p>
            <p className="truncate text-xs text-ink-500">/{category.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (category) => (
        <span className="line-clamp-2 max-w-sm text-ink-600">{category.description || '—'}</span>
      ),
    },
    {
      key: 'menuItemCount',
      header: 'Dishes',
      render: (category) => <span className="font-medium text-ink-900">{category.menuItemCount}</span>,
    },
    {
      key: 'displayOrder',
      header: 'Order',
      render: (category) => <span className="text-ink-600">{category.displayOrder}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (category) => (
        <Badge tone={category.isActive ? 'success' : 'neutral'}>
          {category.isActive ? 'Visible' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (category) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditing(category)}
            aria-label={`Edit ${category.name}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-ink-400 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => setDeleting(category)}
            aria-label={`Delete ${category.name}`}
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
        title="Categories"
        description="How the menu is organised for customers. Display order controls the sequence they appear in."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus className="size-4" aria-hidden="true" />
            New category
          </Button>
        }
      />

      <Card>
        {isError ? (
          <div className="p-5">
            <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={categories}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={Tags}
                title="No categories yet"
                message="Categories group your dishes on the menu — start with something like Starters or Mains."
                action={
                  <Button onClick={() => setEditing({})}>
                    <Plus className="size-4" aria-hidden="true" />
                    New category
                  </Button>
                }
              />
            }
          />
        )}
      </Card>

      <CategoryFormModal category={editing} onClose={() => setEditing(null)} onSaved={invalidate} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeCategory.mutate(deleting.id)}
        isLoading={removeCategory.isPending}
        title={`Delete ${deleting?.name}?`}
        message={
          deleting?.menuItemCount > 0
            ? `This category still has ${deleting.menuItemCount} dish(es). Move them to another category first, or hide this one instead.`
            : 'This category will be removed permanently.'
        }
        confirmLabel="Delete category"
      />
    </>
  )
}

function CategoryFormModal({ category, onClose, onSaved }) {
  const isOpen = category !== null
  const isEdit = Boolean(category?.id)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!isOpen) return
    reset({
      name: category.name ?? '',
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      displayOrder: category.displayOrder ?? 0,
      isActive: category.isActive ?? true,
    })
  }, [isOpen, category, reset])

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        description: values.description?.trim() || null,
        imageUrl: values.imageUrl?.trim() || null,
      }
      return isEdit ? categoryApi.update(category.id, payload) : categoryApi.create(payload)
    },
    onSuccess: (saved) => {
      onSaved()
      onClose()
      toast.success(isEdit ? `${saved.name} updated` : `${saved.name} created`)
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

  if (!isOpen) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${category.name}` : 'New category'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((values) => mutation.mutate(values))}
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Input
          label="Name"
          required
          placeholder="Starters"
          error={errors.name?.message}
          {...register('name')}
        />

        <Textarea
          label="Description"
          rows={2}
          placeholder="Small plates to begin the meal"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Input
            label="Image URL"
            placeholder="https://…"
            hint="Optional header image for the category."
            error={errors.imageUrl?.message}
            {...register('imageUrl')}
          />
          <div className="self-end">
            <DishImage src={watch('imageUrl')} alt="Preview" className="size-20 rounded-lg" />
          </div>
        </div>

        <Input
          label="Display order"
          type="number"
          min="0"
          max="999"
          hint="Lower numbers appear first on the menu."
          error={errors.displayOrder?.message}
          {...register('displayOrder')}
        />

        <Toggle
          checked={watch('isActive')}
          onChange={(checked) => setValue('isActive', checked, { shouldDirty: true })}
          label="Visible to customers"
          description="Hiding a category also hides its dishes from the public menu."
        />
      </form>
    </Modal>
  )
}
