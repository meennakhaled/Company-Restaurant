import { forwardRef, useId } from 'react'
import clsx from 'clsx'

const controlStyles = (hasError) =>
  clsx(
    'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm transition-colors',
    'placeholder:text-ink-400 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500',
    hasError
      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
      : 'border-ink-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
    'focus:outline-none',
  )

/**
 * Wraps any control with its label, hint and error message, and wires up the aria
 * attributes that screen readers need. Every form in the app uses this so validation
 * errors look and behave the same everywhere.
 */
export function Field({ label, error, hint, required, htmlFor, children, className }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-800">
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-ink-500">{hint}</p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={controlStyles(Boolean(error))}
        {...props}
      />
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, rows = 3, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        className={clsx(controlStyles(Boolean(error)), 'resize-y')}
        {...props}
      />
    </Field>
  )
})

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, children, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        className={clsx(controlStyles(Boolean(error)), 'cursor-pointer appearance-none bg-no-repeat pr-9')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237c736a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 0.6rem center',
          backgroundSize: '1.1rem',
        }}
        {...props}
      >
        {children}
      </select>
    </Field>
  )
})

/** Accessible on/off control built on a real checkbox, so it works with forms and keyboards. */
export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex cursor-pointer items-start gap-3',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={clsx(
            'block h-6 w-11 rounded-full transition-colors',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500',
            checked ? 'bg-brand-600' : 'bg-ink-300',
          )}
        />
        <span
          aria-hidden="true"
          className={clsx(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  )
}
