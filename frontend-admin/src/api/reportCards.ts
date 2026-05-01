import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type ReportCard = {
  id: number
  school_year_id: number
  term_id: number | null
  evaluation_period_id: number
  class_id: number
  student_id: number
  student_name: string | null
  student_code: string | null
  class_name: string | null
  evaluation_period_name: string | null
  school_year_name: string | null
  subject_averages: Record<string, number>
  period_average: string | null
  rank: number | null
  rank_out_of: number | null
  absent_count: number
  late_count: number
  status: 'draft' | 'published' | 'archived'
  generated_at: string | null
  published_at: string | null
  archived_at: string | null
  has_pdf: boolean
}

export async function fetchReportCards(params: {
  school_year_id?: number
  evaluation_period_id?: number
  class_id?: number
  student_id?: number
  status?: 'draft' | 'published' | 'archived'
  per_page?: number
  page?: number
} = {}): Promise<Paginated<ReportCard>> {
  const { data } = await apiClient.get<Ok<Paginated<ReportCard>> | Err>(
    '/v1/report-cards',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function generateReportCards(payload: {
  school_year_id: number
  class_id: number
  evaluation_period_id: number
}): Promise<{ items: ReportCard[] }> {
  const { data } = await apiClient.post<Ok<{ items: ReportCard[] }> | Err>(
    '/v1/report-cards/generate',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function publishReportCard(id: number): Promise<ReportCard> {
  const { data } = await apiClient.post<Ok<ReportCard> | Err>(
    `/v1/report-cards/${id}/publish`,
    {}
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function archiveReportCard(id: number): Promise<ReportCard> {
  const { data } = await apiClient.post<Ok<ReportCard> | Err>(
    `/v1/report-cards/${id}/archive`,
    {}
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function downloadReportCardPdf(id: number): Promise<void> {
  const res = await apiClient.get<Blob>(`/v1/report-cards/${id}/pdf`, {
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bulletin_${id}.pdf`
  a.click()
  URL.revokeObjectURL(a.href)
}

