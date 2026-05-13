import axios, { type AxiosError } from 'axios'
import type { ApiEnvelope } from '../types/api'

/** Dev: empty → same-origin `/api` (Vite proxy). If VITE_API_BASE_URL is set, use host root only — `/api` is always appended here. */
function resolveApiBaseURL(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
  if (!raw) {
    return '/api'
  }
  const noTrailing = raw.replace(/\/+$/, '')
  const root = noTrailing.endsWith('/api')
    ? noTrailing.slice(0, -4).replace(/\/+$/, '')
    : noTrailing
  return `${root}/api`
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseURL(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

const TOKEN_KEY = 'paulbert_auth_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Laravel's boolean validation only accepts 1/0, not "true"/"false" strings
  if (config.params) {
    const normalized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(config.params as Record<string, unknown>)) {
      normalized[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v
    }
    config.params = normalized
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    if (error.response?.status === 401) {
      setStoredToken(null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
