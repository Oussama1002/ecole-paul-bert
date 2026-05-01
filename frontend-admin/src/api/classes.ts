import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'
import type { Level } from './levels'
import type { SchoolYear } from './schoolYears'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type ClassMainTeacher = {
  id: number
  first_name: string
  last_name: string
  employee_code: string
}

export type SchoolClass = {
  id: number
  level_id: number
  school_year_id: number
  name: string
  code: string
  section: string | null
  max_students: number | null
  room_label: string | null
  main_teacher_id: number | null
  status: string
  created_at?: string | null
  updated_at?: string | null
  level?: Level
  school_year?: SchoolYear
  main_teacher?: ClassMainTeacher | null
}

export async function fetchClasses(params: {
  page?: number
  per_page?: number
  search?: string
  school_year_id?: number
  level_id?: number
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}): Promise<Paginated<SchoolClass>> {
  const { data } = await apiClient.get<Ok<Paginated<SchoolClass>> | Err>(
    '/v1/classes',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchClass(id: number): Promise<SchoolClass> {
  const { data } = await apiClient.get<Ok<SchoolClass> | Err>(`/v1/classes/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type ClassPayload = {
  level_id: number
  school_year_id: number
  name: string
  code: string
  section?: string | null
  max_students?: number | null
  room_label?: string | null
  main_teacher_id?: number | null
  status?: string
}

export async function createClass(payload: ClassPayload): Promise<SchoolClass> {
  const { data } = await apiClient.post<Ok<SchoolClass> | Err>(
    '/v1/classes',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateClass(
  id: number,
  payload: Partial<ClassPayload>
): Promise<SchoolClass> {
  const { data } = await apiClient.patch<Ok<SchoolClass> | Err>(
    `/v1/classes/${id}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteClass(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/classes/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}
