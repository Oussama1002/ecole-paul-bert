import { apiClient } from './client'
import type { Paginated } from '../types/api'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Student = {
  id: number
  student_code: string
  first_name: string
  last_name: string
  first_name_ar?: string | null
  last_name_ar?: string | null
  gender?: string | null
  date_of_birth: string
  place_of_birth?: string | null
  nationality?: string | null
  address?: string | null
  city?: string | null
  status: string
  admission_date?: string | null
  registration_date?: string | null
  previous_school?: string | null
  blood_group?: string | null
  medical_notes?: string | null
  special_needs?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  parent_phone_1?: string | null
  parent_phone_2?: string | null
  parent_phone_3?: string | null
  notes?: string | null
  guardians?: unknown[]
  enrollments?: unknown[]
}

export type StudentsListParams = {
  page?: number
  per_page?: number
  search?: string
  status?: string
  school_year_id?: number
  level_id?: number
  class_id?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export async function fetchStudents(
  params: StudentsListParams = {}
): Promise<Paginated<Student>> {
  const { data } = await apiClient.get<Ok<Paginated<Student>> | Err>(
    '/v1/students',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchStudent(id: number): Promise<Student> {
  const { data } = await apiClient.get<Ok<Student> | Err>(`/v1/students/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type StudentPayload = {
  student_code: string
  first_name: string
  last_name: string
  first_name_ar?: string | null
  last_name_ar?: string | null
  gender?: string | null
  date_of_birth: string
  place_of_birth?: string | null
  nationality?: string | null
  address?: string | null
  city?: string | null
  status?: string
  admission_date?: string | null
  registration_date?: string | null
  previous_school?: string | null
  blood_group?: string | null
  medical_notes?: string | null
  special_needs?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  parent_phone_1?: string | null
  parent_phone_2?: string | null
  parent_phone_3?: string | null
  notes?: string | null
}

export async function fetchNextStudentCode(): Promise<string> {
  const { data } = await apiClient.get<Ok<{ student_code: string }> | Err>(
    '/v1/students/next-code'
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data.student_code
}

export async function createStudent(payload: StudentPayload): Promise<Student> {
  const { data } = await apiClient.post<Ok<Student> | Err>(
    '/v1/students',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateStudent(
  id: number,
  payload: Partial<StudentPayload>
): Promise<Student> {
  const { data } = await apiClient.patch<Ok<Student> | Err>(
    `/v1/students/${id}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteStudent(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/students/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

/** Permanently delete an archived student (DB row removed). */
export async function forceDeleteStudent(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/students/${id}/force`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

export type StudentHistoryData = {
  enrollments: unknown[]
  class_assignments: unknown[]
  timeline: unknown[]
}

export async function fetchStudentHistory(
  id: number
): Promise<StudentHistoryData> {
  const { data } = await apiClient.get<Ok<StudentHistoryData> | Err>(
    `/v1/students/${id}/history`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchStudentGrades(
  id: number,
  params: { school_year_id?: number; page?: number; per_page?: number } = {}
) {
  const { data } = await apiClient.get<Ok<unknown> | Err>(
    `/v1/students/${id}/grades`,
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data as {
    items: unknown[]
    meta: Paginated<unknown>['meta']
  }
}

export async function fetchStudentAttendance(
  id: number,
  params: { school_year_id?: number; page?: number; per_page?: number } = {}
) {
  const { data } = await apiClient.get<Ok<unknown> | Err>(
    `/v1/students/${id}/attendance`,
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data as {
    items: unknown[]
    meta: Paginated<unknown>['meta']
  }
}

export async function fetchStudentDocuments(id: number) {
  const { data } = await apiClient.get<Ok<unknown[]> | Err>(
    `/v1/students/${id}/documents`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchStudentFinance(id: number) {
  const { data } = await apiClient.get<Ok<unknown> | Err>(
    `/v1/students/${id}/finance`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data as {
    fee_assignments: unknown[]
    payments: unknown[]
  }
}

export async function downloadStudentsExport(
  params: StudentsListParams
): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/students/export', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `eleves_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadStudentsExportExcel(
  params: StudentsListParams
): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/students/export.xlsx', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `eleves_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

export type ImportResult = {
  created: number
  skipped: number
  errors: { row: number; messages: string[] }[]
}

export async function importStudents(
  file: File,
  columnMap?: Record<string, number>
): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  if (columnMap) {
    form.append('column_map', JSON.stringify(columnMap))
  }
  const { data } = await apiClient.post<Ok<ImportResult> | Err>(
    '/v1/students/import',
    form
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}
