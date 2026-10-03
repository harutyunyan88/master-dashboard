export type BookingStatus = 'completed' | 'confirmed' | 'pending'

export interface Service {
  name: string
  price: number
}

export interface Booking {
  id: number
  datetime: string
  date: string // YYYY-MM-DD in salon time
  time: string // HH:MM in salon time
  client_id: number | null
  client_name: string
  client_phone: string | null
  services: Service[]
  price: number
  status: BookingStatus
}

export interface BookingsResponse {
  date_from: string
  date_to: string
  total_amd: number
  count: number
  commission_percent: number | null
  commission_amd: number | null
  bookings: Booking[]
}

export interface ClientInfo {
  id: number
  name: string
  phone: string | null
  email: string | null
  card: string | null
  discount: number
  success_visits_count: number
  fail_visits_count: number
  is_new: boolean
  tags: string[]
}

export interface ClientResponse {
  client: ClientInfo
  total_amd: number
  count: number
  commission_percent: number | null
  commission_amd: number | null
  first_visit: string | null
  last_visit: string | null
  next_visit: string | null
  bookings: Booking[]
}

const TOKEN_KEY = 'altegio-admin-token'
// Fallback when localStorage is unavailable (private mode, blocked storage).
let memoryToken: string | null = null

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token: string): void {
  memoryToken = token
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // memory fallback already set
  }
}

export function clearToken(): void {
  memoryToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing stored
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (response.status === 401 && path !== '/api/auth/login') {
    clearToken()
    window.location.assign('/login')
  }
  if (!response.ok) {
    let message = response.statusText || 'Request failed'
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
    } catch {
      // not JSON
    }
    throw new ApiError(response.status, message)
  }
  return response.json() as Promise<T>
}

export function login(password: string) {
  return request<{ token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
}

export function fetchBookings(dateFrom: string, dateTo: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
  return request<BookingsResponse>(`/api/bookings?${params}`, { signal })
}

export function fetchClient(clientId: string, signal?: AbortSignal) {
  return request<ClientResponse>(`/api/clients/${encodeURIComponent(clientId)}`, { signal })
}
