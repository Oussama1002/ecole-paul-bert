import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Level = {
  id: number
  name: string
  code: string
  description: string | null
  sort_order: number
  status: string
  created_at?: string | null
  updated_at?: string | null
}

export async function fetchLevels(params: {
  page?: number
  per_page?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}): Promise<Paginated<Level>> {
  const { data } = await apiClient.get<Ok<Paginated<Level>> | Err>('/v1/levels', {
    params,
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchLevel(id: number): Promise<Level> {
  const { data } = await apiClient.get<Ok<Level> | Err>(`/v1/levels/${id}`)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function createLevel(payload: {
  name: string
  code?: string
  description?: string | null
  sort_order?: number
  status?: string
}): Promise<Level> {
  const { data } = await apiClient.post<Ok<Level> | Err>('/v1/levels', payload)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateLevel(
  id: number,
  payload: Partial<{
    name: string
    code: string
    description: string | null
    sort_order: number
    status: string
  }>
): Promise<Level> {
  const { data } = await apiClient.patch<Ok<Level> | Err>(
    `/v1/levels/${id}`,
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteLevel(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/levels/${id}`)
  if (!data.success) throw new Error(data.message)
}
