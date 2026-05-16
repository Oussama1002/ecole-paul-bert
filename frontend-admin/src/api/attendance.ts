import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type AttendanceStatus = 'present' | 'absent' | 'late'

export type AttendanceRecord = {
  id: number
  school_year_id: number
  term_id: number | null
  class_id: number
  student_id: number
  subject_id: number | null
  teacher_id: number | null
  schedule_entry_id: number | null
  attendance_date: string
  attendance_status: AttendanceStatus
  minutes_late: number | null
  is_justified: boolean
  justification_note: string | null
  justified_at: string | null
  justified_by: number | null
  marked_by: number | null
  remarks: string | null
}

export type AttendanceRecordListParams = {
  page?: number
  per_page?: number
  school_year_id?: number
  class_id?: number
  student_id?: number
  schedule_entry_id?: number
  attendance_status?: AttendanceStatus
  is_justified?: boolean
  attendance_date?: string
  from?: string
  to?: string
}

export async function fetchAttendanceRecords(
  params: AttendanceRecordListParams = {}
): Promise<Paginated<AttendanceRecord>> {
  const { data } = await apiClient.get<Ok<Paginated<AttendanceRecord>> | Err>(
    '/v1/attendance-records',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type BulkMarkPayload = {
  school_year_id: number
  term_id?: number | null
  attendance_date: string
  schedule_entry_id?: number | null
  subject_id?: number | null
  teacher_id?: number | null
  items: {
    student_id: number
    attendance_status: AttendanceStatus
    minutes_late?: number | null
    remarks?: string | null
  }[]
}

export async function bulkMarkAttendance(
  classId: number,
  payload: BulkMarkPayload
): Promise<{ items: AttendanceRecord[] }> {
  const { data } = await apiClient.post<Ok<{ items: AttendanceRecord[] }> | Err>(
    `/v1/classes/${classId}/attendance/bulk`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function justifyAttendance(
  id: number,
  payload: { is_justified: boolean; justification_note?: string | null }
): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<Ok<AttendanceRecord> | Err>(
    `/v1/attendance-records/${id}/justify`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchAttendanceStats(params: {
  school_year_id: number
  class_id?: number
  student_id?: number
  from?: string
  to?: string
}): Promise<{
  total: number
  present: number
  absent: number
  late: number
  absent_justified: number
  absent_unjustified: number
  late_minutes_total: number
}> {
  const { data } = await apiClient.get<Ok<unknown> | Err>('/v1/attendance/stats', {
    params,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data as {
    total: number
    present: number
    absent: number
    late: number
    absent_justified: number
    absent_unjustified: number
    late_minutes_total: number
  }
}

export async function createAttendanceRecord(payload: {
  school_year_id: number
  class_id: number
  student_id: number
  attendance_date: string
  attendance_status: AttendanceStatus
  term_id?: number | null
  minutes_late?: number | null
  remarks?: string | null
}): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<Ok<AttendanceRecord> | Err>(
    '/v1/attendance-records',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function downloadAttendanceExcel(
  params: AttendanceRecordListParams = {}
): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/attendance-records/export.xlsx', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `absences_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

