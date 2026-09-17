import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import clsx from 'clsx'

/**
 * Food photography is the whole visual identity of a restaurant site, so a broken image URL
 * must never leave a grey box. On error (or when no URL is set) this falls back to a warm
 * branded tile, which reads as intentional rather than missing.
 */
export function DishImage({ src, alt, className, imageClassName, icon: Icon = UtensilsCrossed }) {
  const [failed, setFailed] = useState(false)
  const showFallback = !src || failed

  return (
    <div className={clsx('relative overflow-hidden bg-brand-100', className)}>
      {showFallback ? (
        <div
          className="flex size-full items-center justify-center bg-gradient-to-br from-brand-100 via-brand-200 to-brand-300"
          role="img"
          aria-label={alt}
        >
          <Icon className="size-1/4 max-h-14 min-h-6 text-brand-700/50" aria-hidden="true" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={clsx('size-full object-cover', imageClassName)}
        />
      )}
    </div>
  )
}
