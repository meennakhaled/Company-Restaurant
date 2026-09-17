import { Link } from 'react-router-dom'
import { CalendarDays, ChefHat, Leaf, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { DishImage } from '../../components/ui/DishImage'

const VALUES = [
  {
    icon: CalendarDays,
    title: 'We plan the day, not the quarter',
    body: "Our chefs schedule each day's dishes the evening before. If the fish isn't right, it isn't on the menu — and you'll never order something we can't cook.",
  },
  {
    icon: Leaf,
    title: 'Small suppliers, short lists',
    body: 'A tighter menu means fresher ingredients and less waste. Most of what we serve was bought within forty-eight hours.',
  },
  {
    icon: Sparkles,
    title: 'Honest portions and prices',
    body: "What you see is what you pay. Totals are calculated by our kitchen system, so the price on the menu is the price on the bill.",
  },
]

export function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-forest-900">
        <DishImage
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=70"
          alt=""
          className="absolute inset-0 opacity-25"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-200 uppercase ring-1 ring-white/20 ring-inset">
            <ChefHat className="size-3.5" aria-hidden="true" />
            Our story
          </span>
          <h1 className="mt-6 font-display text-4xl leading-tight font-semibold text-white sm:text-5xl">
            A kitchen that writes its menu every morning
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-200">
            Saffron &amp; Sage started as a twelve-seat room with one rule: cook what's good
            today, and be honest about what that is.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title} className="rounded-card border border-ink-200/70 bg-white p-6 shadow-soft">
              <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <value.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold text-ink-900">{value.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-card bg-brand-600 p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Come and see what's on today
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-brand-50">
            The menu changes every morning. Have a look at what the kitchen is cooking right now.
          </p>
          <Link to="/menu" className="mt-6 inline-block">
            <Button size="lg" variant="secondary">
              View today's menu
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
