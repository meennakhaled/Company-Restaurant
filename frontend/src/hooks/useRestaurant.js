import { useQuery } from '@tanstack/react-query'
import { restaurantApi } from '../services'
import { todayKey } from '../lib/format'

/**
 * Restaurant context from the server: name, currency and — importantly — the current
 * service date.
 *
 * "Today" must come from the kitchen, not from the browser: a customer whose machine has
 * rolled past midnight, or who is in another timezone, would otherwise label and cache the
 * menu against a date the restaurant isn't serving.
 *
 * Falls back to the browser date only so the UI still renders if this request fails.
 */
export function useRestaurant() {
  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-info'],
    queryFn: restaurantApi.info,
    staleTime: 10 * 60 * 1000,
  })

  return {
    info: data,
    serviceDate: data?.serviceDate ?? todayKey(),
    isLoading,
  }
}
