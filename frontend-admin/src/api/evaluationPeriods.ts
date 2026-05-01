import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'
import type { AcademicTerm } from './academicTerms'
import type { SchoolYear } from './schoolYears'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type EvaluationPeriod = {
  id: number
  school_year_id: number
  term_id: number | null
  name: string
  code: string
  start_date: string
  end_date: string
  is_closed: boolean
  sort_order: number
  created_at?: string | null
  updated_at?: string | null
  school_year?: SchoolYear
  term?: AcademicTerm
}

export async function fetchEvaluationPeriods(params: {
  page?: number
  per_page?: number
  school_year_id?: number
  term_id?: number
  is_closed?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}): Promise<Paginated<EvaluationPeriod>> {
  const { data } = await apiClient.get<Ok<Paginated<EvaluationPeriod>> | Err>(
    '/v1/evaluation-periods',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createEvaluationPeriod(payload: {
  school_year_id: number
  term_id?: number | null
  name: string
  code: string
  start_date: string
  end_date: string
  is_closed?: boolean
  sort_order?: number
}): Promise<EvaluationPeriod> {
  const { data } = await apiClient.post<Ok<EvaluationPeriod> | Err>(
    '/v1/evaluation-periods',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateEvaluationPeriod(
  id: number,
  payload: Partial<{
    school_year_id: number
    term_id: number | null
    name: string
    code: string
    start_date: string
    end_date: string
    is_closed: boolean
    sort_order: number
  }>
): Promise<EvaluationPeriod> {
  const { data } = await apiClient.patch<Ok<EvaluationPeriod> | Err>(
    `/v1/evaluation-periods/${id}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteEvaluationPeriod(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/evaluation-periods/${id}`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}
