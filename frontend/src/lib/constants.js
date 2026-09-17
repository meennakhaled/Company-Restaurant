export const ROLES = {
  CUSTOMER: 'Customer',
  STAFF: 'Staff',
  ADMIN: 'Admin',
}

export const ORDER_STATUS = {
  NEW: 'New',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

/** Presentation for each status, in one place so every screen agrees. */
export const ORDER_STATUS_META = {
  New: {
    label: 'New',
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    dot: 'bg-sky-500',
    chart: '#0ea5e9',
    description: 'Waiting for the kitchen to start',
  },
  Preparing: {
    label: 'Preparing',
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dot: 'bg-amber-500',
    chart: '#f59e0b',
    description: 'Being cooked right now',
  },
  Ready: {
    label: 'Ready',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dot: 'bg-emerald-500',
    chart: '#10b981',
    description: 'Ready for pickup or delivery',
  },
  Completed: {
    label: 'Completed',
    badge: 'bg-ink-100 text-ink-700 ring-ink-500/20',
    dot: 'bg-ink-400',
    chart: '#7c736a',
    description: 'Handed over to the customer',
  },
  Cancelled: {
    label: 'Cancelled',
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dot: 'bg-rose-500',
    chart: '#f43f5e',
    description: 'This order will not be prepared',
  },
}

export const ORDER_TYPE_META = {
  DineIn: { label: 'Dine in', icon: 'utensils' },
  Takeaway: { label: 'Takeaway', icon: 'shopping-bag' },
  Delivery: { label: 'Delivery', icon: 'bike' },
}

export const ORDER_TYPES = ['DineIn', 'Takeaway', 'Delivery']

export const MENU_AVAILABILITY = {
  EVERYDAY: 'Everyday',
  DAILY_SPECIAL: 'DailySpecial',
}

/**
 * Note this does not decide whether a dish is on sale — the daily menu planner does, and
 * every dish must be scheduled onto a date to be orderable. This only decides how the dish
 * is planned and presented.
 */
export const AVAILABILITY_META = {
  Everyday: {
    label: 'Everyday staple',
    hint: 'Part of your regular menu. The planner adds all staples to a day in one click.',
  },
  DailySpecial: {
    label: "Chef's special",
    hint: "Picked for particular days and badged as today's special on the customer menu.",
  },
}

/** Palette for the dashboard charts. Ordered so adjacent series stay distinguishable. */
export const CHART_COLORS = ['#ee6a20', '#1f3d33', '#f7b17a', '#0ea5e9', '#a855f7', '#10b981', '#f43f5e']
