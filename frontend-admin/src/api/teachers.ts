import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Teacher = {
  id: number
  user_id?: number | null
  employee_code: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  gender?: string | null
  date_of_birth?: string | null
  hire_date?: string | null
  qualification?: string | null
  specialization?: string | null
  employment_type: string
  years_experience?: number | null
  salary_base?: string | null
  status: string
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
  user?: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
}

export type TeacherAssignment = {
  id: number
  teacher_id: number
  class_id: number
  subject_id: number
  school_year_id: number
  weekly_hours?: string | null
  is_primary: boolean
  status: string
  school_class?: {
    id: number
    name: string
    code: string
    level_id?: number
  }
  subject?: { id: number; name: string; code: string }
  school_year?: { id: number; name: string }
}

export type TeacherDocument = {
  id: number
  teacher_id: number
  document_type: string
  title: string
  file_path: string
  file_url?: string | null
  issued_at?: string | null
  expires_at?: string | null
  notes?: string | null
  created_at?: string
}

export type ScheduleEntry = {
  id: number
  school_year_id: number
  day_of_week: string
  start_time: string
  end_time: string
  session_type: string
  status: string
  school_class?: { id: number; name: string; code: string }
  subject?: { id: number; name: string; code: string }
  room?: { id: number; name: string; code: string } | null
}

export type TeachersListParams = {
  page?: number
  per_page?: number
  search?: string
  status?: string
  employment_type?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export async function fetchTeachers(
  params: TeachersListParams = {}
): Promise<Paginated<Teacher>> {
  const { data } = await apiClient.get<Ok<Paginated<Teacher>> | Err>(
    '/v1/teachers',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchTeacher(id: number): Promise<Teacher> {
  const { data } = await apiClient.get<Ok<Teacher> | Err>(`/v1/teachers/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type TeacherPayload = {
  user_id?: number | null
  employee_code: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  gender?: string | null
  date_of_birth?: string | null
  hire_date?: string | null
  qualification?: string | null
  specialization?: string | null
  employment_type?: string
  years_experience?: number | null
  salary_base?: number | null
  status?: string
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
}

export async function createTeacher(
  payload: TeacherPayload
): Promise<Teacher> {
  const { data } = await apiClient.post<Ok<Teacher> | Err>(
    '/v1/teachers',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateTeacher(
  id: number,
  payload: Partial<TeacherPayload>
): Promise<Teacher> {
  const { data } = await apiClient.patch<Ok<Teacher> | Err>(
    `/v1/teachers/${id}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteTeacher(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/teachers/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

export async function fetchTeacherAssignments(
  teacherId: number
): Promise<TeacherAssignment[]> {
  const { data } = await apiClient.get<Ok<TeacherAssignment[]> | Err>(
    `/v1/teachers/${teacherId}/assignments`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type AssignmentPayload = {
  class_id: number
  subject_id: number
  school_year_id: number
  weekly_hours?: number | null
  is_primary?: boolean
  status?: string
}

export async function createTeacherAssignment(
  teacherId: number,
  payload: AssignmentPayload
): Promise<TeacherAssignment> {
  const { data } = await apiClient.post<Ok<TeacherAssignment> | Err>(
    `/v1/teachers/${teacherId}/assignments`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateTeacherAssignment(
  assignmentId: number,
  payload: Partial<AssignmentPayload>
): Promise<TeacherAssignment> {
  const { data } = await apiClient.patch<Ok<TeacherAssignment> | Err>(
    `/v1/teacher-class-subjects/${assignmentId}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteTeacherAssignment(
  assignmentId: number
): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/teacher-class-subjects/${assignmentId}`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

export async function fetchTeacherSchedule(
  teacherId: number,
  schoolYearId?: number
): Promise<ScheduleEntry[]> {
  const { data } = await apiClient.get<Ok<ScheduleEntry[]> | Err>(
    `/v1/teachers/${teacherId}/schedule`,
    { params: schoolYearId ? { school_year_id: schoolYearId } : {} }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function fetchTeacherDocuments(
  teacherId: number
): Promise<TeacherDocument[]> {
  const { data } = await apiClient.get<Ok<TeacherDocument[]> | Err>(
    `/v1/teachers/${teacherId}/documents`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function uploadTeacherDocument(
  teacherId: number,
  file: File,
  documentType: string,
  extra?: { title?: string; issued_at?: string; expires_at?: string; notes?: string }
): Promise<TeacherDocument> {
  const form = new FormData()
  form.append('file', file)
  form.append('document_type', documentType)
  if (extra?.title) form.append('title', extra.title)
  if (extra?.issued_at) form.append('issued_at', extra.issued_at)
  if (extra?.expires_at) form.append('expires_at', extra.expires_at)
  if (extra?.notes) form.append('notes', extra.notes)

  const { data } = await apiClient.post<Ok<TeacherDocument> | Err>(
    `/v1/teachers/${teacherId}/documents`,
    form,
    {
      transformRequest: [
        (body, headers) => {
          if (body instanceof FormData) {
            delete headers['Content-Type']
          }
          return body
        },
      ],
    }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteTeacherDocument(docId: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/teacher-documents/${docId}`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

export type TeacherObservationType = 'observation' | 'complaint' | 'note'

export type TeacherObservation = {
  id: number
  teacher_id: number
  type: TeacherObservationType
  comment: string
  created_by: number | null
  created_at: string
  updated_at: string
  author?: { id: number | null; name: string | null } | null
}

export async function fetchTeacherObservations(
  teacherId: number
): Promise<TeacherObservation[]> {
  const { data } = await apiClient.get<Ok<TeacherObservation[]> | Err>(
    `/v1/teachers/${teacherId}/observations`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createTeacherObservation(
  teacherId: number,
  payload: { type: TeacherObservationType; comment: string }
): Promise<TeacherObservation> {
  const { data } = await apiClient.post<Ok<TeacherObservation> | Err>(
    `/v1/teachers/${teacherId}/observations`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteTeacherObservation(
  teacherId: number,
  observationId: number
): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/teachers/${teacherId}/observations/${observationId}`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}
