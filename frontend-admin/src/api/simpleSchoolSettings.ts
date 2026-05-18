import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type SimpleSchoolSettings = {
  school: {
    name: string
    address: string
    city: string
    phone: string
    email: string
    logo_path: string | null
    logo_url: string | null
  }
  current_school_year: {
    id: number | null
    name: string | null
    options: { id: number; name: string; status: string; is_current: boolean }[]
  }
  bulletin: {
    title: string
    signature_line: string
    footer_line: string
    show_attendance: boolean
    show_ranking: boolean
    principal_comment: string
    teacher_comment: string
  }
  attendance_alerts: {
    window_days: number
    unjustified_absences: number
    late_count: number
  }
  finance_journal: {
    income_labels: string[]
    expense_labels: string[]
  }
  meta: { can_edit: boolean; can_manage_structure?: boolean }
}

export async function fetchSimpleSchoolSettings(): Promise<SimpleSchoolSettings> {
  const { data } = await apiClient.get<Ok<SimpleSchoolSettings> | Err>(
    '/v1/simple-school-settings'
  )
  if (!data.success) {
    throw new Error(messageFromFailedApiPayload(data))
  }
  return data.data
}

export type SimpleSchoolSettingsPatch = {
  school?: Partial<
    Pick<
      SimpleSchoolSettings['school'],
      'name' | 'address' | 'city' | 'phone' | 'email'
    >
  >
  bulletin?: Partial<
    Pick<
      SimpleSchoolSettings['bulletin'],
      | 'title'
      | 'signature_line'
      | 'footer_line'
      | 'show_attendance'
      | 'show_ranking'
      | 'principal_comment'
      | 'teacher_comment'
    >
  >
  attendance_alerts?: Partial<SimpleSchoolSettings['attendance_alerts']>
  finance_journal?: Partial<SimpleSchoolSettings['finance_journal']>
  current_school_year_id?: number | null
}

export async function patchSimpleSchoolSettings(
  payload: SimpleSchoolSettingsPatch
): Promise<SimpleSchoolSettings> {
  const body: Record<string, unknown> = {}
  if (payload.school) body.school = payload.school
  if (payload.bulletin) body.bulletin = payload.bulletin
  if (payload.attendance_alerts) body.attendance_alerts = payload.attendance_alerts
  if (payload.finance_journal) body.finance_journal = payload.finance_journal
  if ('current_school_year_id' in payload) {
    body.current_school_year_id = payload.current_school_year_id
  }

  const { data } = await apiClient.patch<Ok<SimpleSchoolSettings> | Err>(
    '/v1/simple-school-settings',
    body
  )
  if (!data.success) {
    throw new Error(messageFromFailedApiPayload(data))
  }
  return data.data
}

export async function uploadSchoolLogo(file: File): Promise<SimpleSchoolSettings> {
  const fd = new FormData()
  fd.append('logo', file)
  const { data } = await apiClient.post<Ok<SimpleSchoolSettings> | Err>(
    '/v1/simple-school-settings/logo',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  if (!data.success) {
    throw new Error(messageFromFailedApiPayload(data))
  }
  return data.data
}
