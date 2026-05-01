import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Enrollment = {
  id: number
  student_id: number
  school_year_id: number
  class_id: number
  school_year_name?: string | null
  class_name?: string | null
  enrollment_number: string
  enrollment_date: string
  academic_status: string
  admission_type: string
  registration_status: string
  remarks?: string | null
  school_year?: { id: number; name: string }
  school_class?: { id: number; name: string; code: string }
}

export async function fetchEnrollments(params: {
  student_id?: number
  school_year_id?: number
  class_id?: number
  per_page?: number
  page?: number
}) {
  const { data } = await apiClient.get<Ok<Paginated<Enrollment>> | Err>(
    '/v1/enrollments',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createEnrollment(payload: {
  student_id: number
  school_year_id: number
  class_id: number
  enrollment_number: string
  enrollment_date: string
  academic_status?: string
  admission_type?: string
  registration_status?: string
  remarks?: string | null
}): Promise<Enrollment> {
  const { data } = await apiClient.post<Ok<Enrollment> | Err>(
    '/v1/enrollments',
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateEnrollment(
  id: number,
  payload: Partial<{
    class_id: number
    enrollment_number: string
    enrollment_date: string
    academic_status: string
    admission_type: string
    registration_status: string
    remarks: string | null
  }>
): Promise<Enrollment> {
  const { data } = await apiClient.patch<Ok<Enrollment> | Err>(
    `/v1/enrollments/${id}`,
    payload
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}
