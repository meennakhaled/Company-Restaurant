const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

export const formatCurrency = (value) => currencyFormatter.format(Number(value ?? 0))

export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value ?? 0))

/** The API sends UTC without a trailing Z; append one so the browser converts to local time. */
const toDate = (value) => {
  if (!value) return null
  const normalised = typeof value === 'string' && !value.endsWith('Z') && value.includes('T')
    ? `${value}Z`
    : value
  const date = new Date(normalised)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value) => {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : '—'
}

export const formatTime = (value) => {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : '—'
}

export const formatDateTime = (value) => {
  const date = toDate(value)
  return date ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}` : '—'
}

/** "just now" / "12m ago" — how long a kitchen ticket has been waiting. */
export function formatRelative(value) {
  const date = toDate(value)
  if (!date) return '—'

  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

/** Minutes since a timestamp, used to flag orders the kitchen is sitting on. */
export function minutesSince(value) {
  const date = toDate(value)
  return date ? Math.max(0, Math.round((Date.now() - date.getTime()) / 60000)) : 0
}

/** Local YYYY-MM-DD. Never use toISOString() here — it shifts the date across timezones. */
export function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export const todayKey = () => toDateKey(new Date())

export function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return toDateKey(date)
}

export function formatDateKey(dateKey, options = { weekday: 'long', month: 'short', day: 'numeric' }) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', options).format(new Date(year, month - 1, day))
}

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
