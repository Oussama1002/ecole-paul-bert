import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type SimpleAttendanceStatus = 'present' | 'absent' | 'late'

export type StudentMonthlyTotals = {
  month: string
  class_id: number
  totals: { student_id: number; present: number; absent: number; late: number }[]
}

export async function fetchStudentMonthlyTotals(params: {
  class_id: number
  month: string
}): Promise<StudentMonthlyTotals> {
  const { data } = await apiClient.get<Ok<StudentMonthlyTotals> | Err>(
    '/v1/simple/attendance/students',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type TeacherDayRoster = {
  date: string
  teachers: {
    teacher_id: number
    first_name: string
    last_name: string
    status: SimpleAttendanceStatus | null
    minutes_late: number | null
    reason: string | null
  }[]
}

export async function fetchTeacherDayRoster(date: string): Promise<TeacherDayRoster> {
  const { data } = await apiClient.get<Ok<TeacherDayRoster> | Err>(
    '/v1/simple/attendance/teachers/day',
    { params: { date } }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type TeacherMonthly = {
  month: string
  records: {
    id: number
    teacher_id: number
    attendance_date: string
    status: SimpleAttendanceStatus
    minutes_late: number | null
    reason: string | null
  }[]
  totals: { teacher_id: number; present: number; absent: number; late: number }[]
}

export async function fetchTeacherMonthly(month: string): Promise<TeacherMonthly> {
  const { data } = await apiClient.get<Ok<TeacherMonthly> | Err>(
    '/v1/simple/attendance/teachers',
    { params: { month } }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function upsertTeacherAttendance(payload: {
  teacher_id: number
  attendance_date: string
  status: SimpleAttendanceStatus
  minutes_late?: number | null
  reason?: string | null
}): Promise<void> {
  const { data } = await apiClient.post<Ok<unknown> | Err>(
    '/v1/simple/attendance/teachers',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}
