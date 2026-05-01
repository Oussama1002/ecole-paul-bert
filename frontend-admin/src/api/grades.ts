import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Grade = {
  id: number
  school_year_id: number
  term_id: number | null
  evaluation_period_id: number
  class_id: number
  student_id: number
  subject_id: number
  teacher_id: number | null
  score: string
  max_score: string
  coefficient: string
  weighted_score: string | null
  appreciation: string | null
  is_validated: boolean
  validated_at: string | null
  validated_by: number | null
  entered_by: number | null
}

export async function fetchGrades(params: {
  school_year_id?: number
  evaluation_period_id?: number
  class_id?: number
  student_id?: number
  subject_id?: number
  is_validated?: boolean
  per_page?: number
  page?: number
} = {}): Promise<Paginated<Grade>> {
  const { data } = await apiClient.get<Ok<Paginated<Grade>> | Err>('/v1/grades', {
    params,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function bulkStoreGrades(payload: {
  school_year_id: number
  term_id?: number | null
  evaluation_period_id: number
  class_id: number
  subject_id: number
  teacher_id?: number | null
  max_score: number
  coefficient?: number | null
  items: { student_id: number; score: number; appreciation?: string | null }[]
}): Promise<{ items: Grade[] }> {
  const { data } = await apiClient.post<Ok<{ items: Grade[] }> | Err>(
    '/v1/grades/bulk',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchClassRanking(params: {
  school_year_id: number
  class_id: number
  evaluation_period_id: number
}): Promise<{
  ranking_strategy: string
  subject_ids: number[]
  items: {
    student: { id: number; student_code?: string; first_name?: string; last_name?: string }
    period_average: number | null
    rank: number | null
    subject_averages: Record<string, number>
  }[]
}> {
  const { data } = await apiClient.get<Ok<unknown> | Err>('/v1/grades/class-ranking', {
    params,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data as {
    ranking_strategy: string
    subject_ids: number[]
    items: {
      student: { id: number; student_code?: string; first_name?: string; last_name?: string }
      period_average: number | null
      rank: number | null
      subject_averages: Record<string, number>
    }[]
  }
}

export async function recalculateGrades(payload: {
  school_year_id: number
  evaluation_period_id: number
  class_id?: number
}): Promise<{ updated: number }> {
  const { data } = await apiClient.post<Ok<{ updated: number }> | Err>(
    '/v1/grades/recalculate',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createGrade(payload: {
  school_year_id: number
  evaluation_period_id: number
  class_id: number
  student_id: number
  subject_id: number
  score: number
  max_score: number
  coefficient?: number
  appreciation?: string | null
  term_id?: number | null
  teacher_id?: number | null
}): Promise<Grade> {
  const { data } = await apiClient.post<Ok<Grade> | Err>('/v1/grades', payload)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateGrade(
  id: number,
  payload: Partial<{
    score: number
    max_score: number
    coefficient: number
    appreciation: string | null
    is_validated: boolean
  }>
): Promise<Grade> {
  const { data } = await apiClient.patch<Ok<Grade> | Err>(`/v1/grades/${id}`, payload)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function downloadGradesExcel(params: {
  school_year_id?: number
  evaluation_period_id?: number
  class_id?: number
  student_id?: number
  subject_id?: number
  is_validated?: boolean
} = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/grades/export.xlsx', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `notes_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

