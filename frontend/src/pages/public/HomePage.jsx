import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, ChefHat, Clock, Sparkles, UtensilsCrossed } from 'lucide-react'
import { menuApi } from '../../services'
import { MenuItemCard } from '../../components/menu/MenuItemCard'
import { Button } from '../../components/ui/Button'
import { CardSkeletonGrid, EmptyState } from '../../components/ui/States'
import { DishImage } from '../../components/ui/DishImage'
import { useRestaurant } from '../../hooks/useRestaurant'
import { formatDateKey } from '../../lib/format'

const HIGHLIGHTS = [
  {
    icon: CalendarDays,
    title: 'A menu that changes daily',
    body: "Our chefs plan each day's dishes the night before, around what the market has. What you see is what we cooked today.",
  },
  {
    icon: Clock,
    title: 'Live order tracking',
    body: 'Watch your order move from the kitchen to your table in real time — no refreshing, no guessing.',
  },
  {
    icon: ChefHat,
    title: 'Cooked to order',
    body: 'Nothing sits under a heat lamp. Every plate is fired when you order it, which is why prep times are honest.',
  },
]

export function HomePage() {
  const { serviceDate } = useRestaurant()

  const {
    data: specials,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['menu', 'specials'],
    queryFn: () => menuApi.specials(6),
  })

  const specialItems = specials?.items ?? []

  return (
    <>
      <section className="relative overflow-hidden bg-forest-900">
        <DishImage
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=70"
          alt=""
          className="absolute inset-0 opacity-25"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-200 uppercase ring-1 ring-white/20 ring-inset">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {formatDateKey(serviceDate, { weekday: 'long' })}'s kitchen is open
            </span>

            <h1 className="mt-6 font-display text-4xl leading-tight font-semibold text-white sm:text-5xl lg:text-6xl">
              Today we cooked <span className="text-brand-400">something worth</span> coming in for.
            </h1>

            <p className="mt-5 max-w-xl text-lg text-ink-200">
              Saffron &amp; Sage writes a new menu every morning. Browse what's on today,
              order in a couple of taps, and follow it from the pass to your table.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/menu">
                <Button size="lg">
                  See today's menu
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {HIGHLIGHTS.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-card border border-ink-200/70 bg-white p-6 shadow-soft"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <highlight.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold text-ink-900">{highlight.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{highlight.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink-900">Today's specials</h2>
            <p className="mt-1 text-ink-500">
              {formatDateKey(serviceDate)} — scheduled by the chef this morning.
            </p>
          </div>
          <Link to="/menu">
            <Button variant="secondary">
              Full menu
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <CardSkeletonGrid count={3} />
        ) : isError || specialItems.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No specials scheduled for today"
            message="Our everyday menu is still available — plenty of good things on it."
            action={
              <Link to="/menu">
                <Button>Browse the menu</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {specialItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
