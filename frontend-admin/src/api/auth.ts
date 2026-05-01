import axios from 'axios'
import { apiClient, setStoredToken } from './client'
import type { AuthUser } from '../types/api'

export type LoginPayload = {
  email: string
  password: string
}

export type LoginData = {
  user: AuthUser
  token: string
  token_type: string
  permission_codes: string[]
}

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export async function login(payload: LoginPayload): Promise<LoginData> {
  try {
    const { data } = await apiClient.post<Ok<LoginData> | Err>(
      '/v1/auth/login',
      payload
    )
    if (!data.success) {
      throw new Error(data.message)
    }
    setStoredToken(data.data.token)
    return data.data
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const body = e.response?.data as Err | undefined
      if (body?.message) {
        throw new Error(body.message)
      }
      if (!e.response) {
        throw new Error(
          'Impossible de joindre l’API. Vérifiez que le backend est démarré et que le proxy Vite (VITE_API_PROXY_TARGET) pointe sur le bon port.'
        )
      }
    }
    throw e
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/v1/auth/logout')
  } finally {
    setStoredToken(null)
  }
}

export type MeData = {
  user: AuthUser
  permission_codes: string[]
}

export async function fetchMe(): Promise<MeData> {
  const { data } = await apiClient.get<Ok<MeData> | Err>('/v1/auth/me')
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export type UpdateProfilePayload = {
  first_name: string
  last_name: string
  email: string
  username?: string | null
  phone?: string | null
  gender?: string | null
  date_of_birth?: string | null
  address?: string | null
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<MeData> {
  const { data } = await apiClient.patch<Ok<MeData> | Err>('/v1/auth/profile', payload)
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export async function changePassword(payload: {
  current_password: string
  password: string
  password_confirmation: string
}): Promise<void> {
  const { data } = await apiClient.post<Ok<null> | Err>(
    '/v1/auth/change-password',
    payload
  )
  if (!data.success) {
    throw new Error(data.message)
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const { data } = await apiClient.post<Ok<null> | Err>(
    '/v1/auth/forgot-password',
    { email }
  )
  if (!data.success) {
    throw new Error(data.message)
  }
}

export async function resetPassword(payload: {
  email: string
  token: string
  password: string
  password_confirmation: string
}): Promise<void> {
  const { data } = await apiClient.post<Ok<null> | Err>(
    '/v1/auth/reset-password',
    payload
  )
  if (!data.success) {
    throw new Error(data.message)
  }
}
