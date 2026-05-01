import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type SchoolYear = {
  id: number
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  status: string
  created_at?: string | null
  updated_at?: string | null
}

export type SchoolYearsParams = {
  page?: number
  per_page?: number
  search?: string
  status?: string
  is_current?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export async function fetchSchoolYears(
  params: SchoolYearsParams = {}
): Promise<Paginated<SchoolYear>> {
  const { data } = await apiClient.get<Ok<Paginated<SchoolYear>> | Err>(
    '/v1/school-years',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchSchoolYear(id: number): Promise<SchoolYear> {
  const { data } = await apiClient.get<Ok<SchoolYear> | Err>(`/v1/school-years/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type SchoolYearPayload = {
  name: string
  start_date: string
  end_date: string
  status: string
  is_current?: boolean
}

export async function createSchoolYear(
  payload: SchoolYearPayload
): Promise<SchoolYear> {
  const { data } = await apiClient.post<Ok<SchoolYear> | Err>(
    '/v1/school-years',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateSchoolYear(
  id: number,
  payload: Partial<SchoolYearPayload>
): Promise<SchoolYear> {
  const { data } = await apiClient.patch<Ok<SchoolYear> | Err>(
    `/v1/school-years/${id}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteSchoolYear(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/school-years/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

export async function setSchoolYearCurrent(id: number): Promise<SchoolYear> {
  const { data } = await apiClient.post<Ok<SchoolYear> | Err>(
    `/v1/school-years/${id}/set-current`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}
