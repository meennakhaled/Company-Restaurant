import { apiClient } from '../lib/apiClient'

/**
 * One thin module per API area. Components never call axios directly — they call these,
 * so URLs and payload shapes are defined once and the React Query hooks stay readable.
 */

const unwrap = (promise) => promise.then((response) => response.data)

// Drops empty filters so the query string only carries what the user actually chose.
const params = (values = {}) =>
  Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )

export const restaurantApi = {
  /** Name, currency and the server's current service date. */
  info: () => unwrap(apiClient.get('/restaurant')),
}

export const authApi = {
  register: (payload) => unwrap(apiClient.post('/auth/register', payload)),
  login: (payload) => unwrap(apiClient.post('/auth/login', payload)),
  logout: (refreshToken) => unwrap(apiClient.post('/auth/logout', { refreshToken })),
  me: () => unwrap(apiClient.get('/auth/me')),
  updateProfile: (payload) => unwrap(apiClient.put('/auth/me', payload)),
  changePassword: (payload) => unwrap(apiClient.post('/auth/change-password', payload)),
}

export const menuApi = {
  browse: (query) => unwrap(apiClient.get('/menu', { params: params(query) })),
  item: (id) => unwrap(apiClient.get(`/menu/${id}`)),
  specials: (pageSize = 6) => unwrap(apiClient.get('/menu/specials', { params: { pageSize } })),
}

export const categoryApi = {
  list: (includeInactive = false) => unwrap(apiClient.get('/categories', { params: { includeInactive } })),
  create: (payload) => unwrap(apiClient.post('/categories', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/categories/${id}`, payload)),
  remove: (id) => unwrap(apiClient.delete(`/categories/${id}`)),
}

export const menuItemApi = {
  search: (query) => unwrap(apiClient.get('/menu-items', { params: params(query) })),
  get: (id) => unwrap(apiClient.get(`/menu-items/${id}`)),
  create: (payload) => unwrap(apiClient.post('/menu-items', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/menu-items/${id}`, payload)),
  setAvailability: (id, isAvailable) =>
    unwrap(apiClient.patch(`/menu-items/${id}/availability`, { isAvailable })),
  remove: (id) => unwrap(apiClient.delete(`/menu-items/${id}`)),
}

export const dailyMenuApi = {
  forDate: (date) => unwrap(apiClient.get('/daily-menus', { params: { date } })),
  calendar: (from, to) => unwrap(apiClient.get('/daily-menus/calendar', { params: { from, to } })),
  addItem: (date, payload) => unwrap(apiClient.post('/daily-menus', payload, { params: { date } })),
  updateItem: (id, payload) => unwrap(apiClient.put(`/daily-menus/${id}`, payload)),
  setSoldOut: (id, isSoldOut) => unwrap(apiClient.patch(`/daily-menus/${id}/sold-out`, { isSoldOut })),
  removeItem: (id) => unwrap(apiClient.delete(`/daily-menus/${id}`)),
  /** Fills a day with every everyday staple that isn't already on it. */
  addStaples: (date) => unwrap(apiClient.post('/daily-menus/staples', null, { params: { date } })),
  copy: (payload) => unwrap(apiClient.post('/daily-menus/copy', payload)),
}

export const orderApi = {
  preview: (payload) => unwrap(apiClient.post('/orders/preview', payload)),
  place: (payload) => unwrap(apiClient.post('/orders', payload)),
  mine: (query) => unwrap(apiClient.get('/orders/my', { params: params(query) })),
  search: (query) => unwrap(apiClient.get('/orders', { params: params(query) })),
  get: (id) => unwrap(apiClient.get(`/orders/${id}`)),
  updateStatus: (id, status, note) =>
    unwrap(apiClient.patch(`/orders/${id}/status`, { status, note })),
  cancel: (id, reason) => unwrap(apiClient.post(`/orders/${id}/cancel`, { reason })),
}

export const userApi = {
  search: (query) => unwrap(apiClient.get('/users', { params: params(query) })),
  createStaff: (payload) => unwrap(apiClient.post('/users/staff', payload)),
  updateRole: (id, role) => unwrap(apiClient.patch(`/users/${id}/role`, { role })),
  updateStatus: (id, isActive) => unwrap(apiClient.patch(`/users/${id}/status`, { isActive })),
}

export const dashboardApi = {
  overview: (days = 14) => unwrap(apiClient.get('/dashboard/overview', { params: { days } })),
}
