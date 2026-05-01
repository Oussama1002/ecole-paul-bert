import { apiClient } from './client'
import type { Paginated } from '../types/api'
import type { Level } from './levels'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Subject = {
  id: number
  level_id: number | null
  name: string
  code: string
  description: string | null
  coefficient: string
  is_optional: boolean
  status: string
  created_at?: string | null
  updated_at?: string | null
  level?: Level
}

export async function fetchSubjects(params: {
  page?: number
  per_page?: number
  search?: string
  level_id?: number
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}): Promise<Paginated<Subject>> {
  const { data } = await apiClient.get<Ok<Paginated<Subject>> | Err>(
    '/v1/subjects',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchSubject(id: number): Promise<Subject> {
  const { data } = await apiClient.get<Ok<Subject> | Err>(`/v1/subjects/${id}`)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function createSubject(payload: {
  level_id?: number | null
  name: string
  code: string
  description?: string | null
  coefficient?: number
  is_optional?: boolean
  status?: string
}): Promise<Subject> {
  const { data } = await apiClient.post<Ok<Subject> | Err>('/v1/subjects', payload)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateSubject(
  id: number,
  payload: Partial<{
    level_id: number | null
    name: string
    code: string
    description: string | null
    coefficient: number
    is_optional: boolean
    status: string
  }>
): Promise<Subject> {
  const { data } = await apiClient.patch<Ok<Subject> | Err>(
    `/v1/subjects/${id}`,
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteSubject(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/subjects/${id}`)
  if (!data.success) throw new Error(data.message)
}
