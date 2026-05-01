import { apiClient } from './client'
import type { AuthUser } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type UsersListParams = {
  page?: number
  per_page?: number
  search?: string
  role_id?: number
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type UsersListData = {
  items: AuthUser[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
}

export async function fetchUsers(
  params: UsersListParams = {}
): Promise<UsersListData> {
  const { data } = await apiClient.get<Ok<UsersListData> | Err>('/v1/users', {
    params,
  })
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export async function fetchUser(id: number): Promise<AuthUser> {
  const { data } = await apiClient.get<Ok<AuthUser> | Err>(`/v1/users/${id}`)
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export type CreateUserPayload = {
  role_id: number
  first_name: string
  last_name: string
  email: string
  username?: string | null
  phone?: string | null
  password: string
  password_confirmation: string
  status?: string
  gender?: string | null
}

export async function createUser(
  payload: CreateUserPayload
): Promise<AuthUser> {
  const { data } = await apiClient.post<Ok<AuthUser> | Err>('/v1/users', payload)
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}

export type UpdateUserPayload = {
  role_id?: number
  first_name?: string
  last_name?: string
  email?: string
  username?: string | null
  phone?: string | null
  password?: string
  password_confirmation?: string
  status?: string
  gender?: string | null
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload
): Promise<AuthUser> {
  const { data } = await apiClient.patch<Ok<AuthUser> | Err>(
    `/v1/users/${id}`,
    payload
  )
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}
