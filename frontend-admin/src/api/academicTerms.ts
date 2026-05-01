import { apiClient } from './client'
import type { Paginated } from '../types/api'
import type { SchoolYear } from './schoolYears'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type AcademicTerm = {
  id: number
  school_year_id: number
  name: string
  code: string
  start_date: string
  end_date: string
  sort_order: number
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
  school_year?: SchoolYear
}

export async function fetchAcademicTerms(params: {
  page?: number
  per_page?: number
  school_year_id?: number
  is_active?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}): Promise<Paginated<AcademicTerm>> {
  const { data } = await apiClient.get<Ok<Paginated<AcademicTerm>> | Err>(
    '/v1/academic-terms',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function createAcademicTerm(payload: {
  school_year_id: number
  name: string
  code: string
  start_date: string
  end_date: string
  sort_order?: number
  is_active?: boolean
}): Promise<AcademicTerm> {
  const { data } = await apiClient.post<Ok<AcademicTerm> | Err>(
    '/v1/academic-terms',
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateAcademicTerm(
  id: number,
  payload: Partial<{
    school_year_id: number
    name: string
    code: string
    start_date: string
    end_date: string
    sort_order: number
    is_active: boolean
  }>
): Promise<AcademicTerm> {
  const { data } = await apiClient.patch<Ok<AcademicTerm> | Err>(
    `/v1/academic-terms/${id}`,
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteAcademicTerm(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/academic-terms/${id}`
  )
  if (!data.success) throw new Error(data.message)
}
