import { Link } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <UtensilsCrossed className="size-8" aria-hidden="true" />
      </span>
      <p className="font-display text-5xl font-semibold text-ink-900">404</p>
      <div>
        <h1 className="text-xl font-semibold text-ink-900">This page isn't on the menu</h1>
        <p className="mt-1 max-w-md text-sm text-ink-500">
          The link may be out of date, or the page may have moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Link to="/">
          <Button variant="secondary">Go home</Button>
        </Link>
        <Link to="/menu">
          <Button>Browse the menu</Button>
        </Link>
      </div>
    </div>
  )
}
