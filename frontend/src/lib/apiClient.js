import axios from 'axios'

const TOKEN_KEY = 'restaurant.auth'

/**
 * Tokens live in localStorage so a refresh does not sign the user out. This is the usual
 * trade-off for a token-based SPA: it is readable by any script on the page, which is why
 * the access token is short-lived and the refresh token is rotated on every use.
 */
export const tokenStorage = {
  read() {
    try {
      const raw = localStorage.getItem(TOKEN_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  write(session) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
  },
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const session = tokenStorage.read()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

// Callback registered by AuthProvider so a failed refresh can clear React state too,
// not just localStorage.
let onSessionExpired = () => {}
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler
}

// Concurrent 401s must not each fire their own refresh, or they invalidate one another
// (the server rotates refresh tokens). The first one refreshes; the rest await it.
let refreshPromise = null

async function refreshSession() {
  const session = tokenStorage.read()
  if (!session?.refreshToken) throw new Error('No refresh token')

  const { data } = await axios.post('/api/auth/refresh', {
    refreshToken: session.refreshToken,
  })

  tokenStorage.write(data)
  return data
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    const canRetry =
      status === 401 &&
      original &&
      !original._retried &&
      // The auth endpoints themselves must never trigger a refresh loop.
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/register')

    if (canRetry) {
      original._retried = true
      try {
        refreshPromise = refreshPromise ?? refreshSession()
        const session = await refreshPromise
        refreshPromise = null

        original.headers.Authorization = `Bearer ${session.accessToken}`
        return apiClient(original)
      } catch (refreshError) {
        refreshPromise = null
        tokenStorage.clear()
        onSessionExpired()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

/**
 * Turns any failure into a message worth showing a human. The API's ProblemDetails shape
 * carries a `title` for the headline and an `errors` map for per-field messages.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data

  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0]
    if (first) return first
  }

  if (data?.title) return data.title
  if (error?.message === 'Network Error') return 'Cannot reach the server. Is the API running?'

  return fallback
}

/** Field-level errors, ready to hand to react-hook-form's setError. */
export function getFieldErrors(error) {
  return error?.response?.data?.errors ?? null
}
