import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type ScheduleEntryDto = {
  id: number
  school_year_id: number
  term_id?: number | null
  class_id: number
  subject_id: number
  teacher_id: number
  room_id?: number | null
  day_of_week: string
  start_time: string
  end_time: string
  session_type: string
  is_recurring: boolean
  effective_start_date?: string | null
  effective_end_date?: string | null
  status: string
  notes?: string | null
  school_class?: { id: number; name: string; code: string }
  subject?: { id: number; name: string; code: string }
  room?: { id: number; name: string; code: string } | null
  teacher?: {
    id: number
    first_name: string
    last_name: string
    employee_code: string
  }
}

export type WeeklyScheduleData = {
  week_start: string
  week_end: string
  school_year: { id: number; name: string }
  days: Record<string, ScheduleEntryDto[]>
}

export type ScheduleConflict = {
  code: string
  message: string
  conflicting_entry_id: number
}

export type ScheduleErrorBody = Err & { conflicts?: ScheduleConflict[] }

export async function fetchWeeklySchedule(params: {
  school_year_id: number
  week_start: string
  class_id?: number
  teacher_id?: number
  room_id?: number
  status?: string
}): Promise<WeeklyScheduleData> {
  const { data } = await apiClient.get<Ok<WeeklyScheduleData> | ScheduleErrorBody>(
    '/v1/schedule/weekly',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type ScheduleEntriesParams = {
  page?: number
  per_page?: number
  school_year_id?: number
  class_id?: number
  teacher_id?: number
  room_id?: number
  day_of_week?: string
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export async function fetchScheduleEntries(
  params: ScheduleEntriesParams = {}
): Promise<Paginated<ScheduleEntryDto>> {
  const { data } = await apiClient.get<Ok<Paginated<ScheduleEntryDto>> | Err>(
    '/v1/schedule-entries',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchScheduleEntry(
  id: number
): Promise<ScheduleEntryDto> {
  const { data } = await apiClient.get<Ok<ScheduleEntryDto> | Err>(
    `/v1/schedule-entries/${id}`
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type ScheduleEntryPayload = {
  school_year_id: number
  term_id?: number | null
  class_id: number
  subject_id: number
  teacher_id: number
  room_id?: number | null
  day_of_week: string
  start_time: string
  end_time: string
  session_type?: string
  is_recurring?: boolean
  effective_start_date?: string | null
  effective_end_date?: string | null
  status?: string
  notes?: string | null
}

export async function createScheduleEntry(
  payload: ScheduleEntryPayload
): Promise<ScheduleEntryDto> {
  const { data } = await apiClient.post<Ok<ScheduleEntryDto> | Err>(
    '/v1/schedule-entries',
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateScheduleEntry(
  id: number,
  payload: Partial<ScheduleEntryPayload>
): Promise<ScheduleEntryDto> {
  const { data } = await apiClient.patch<Ok<ScheduleEntryDto> | Err>(
    `/v1/schedule-entries/${id}`,
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteScheduleEntry(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/schedule-entries/${id}`
  )
  if (!data.success) throw new Error(data.message)
}
