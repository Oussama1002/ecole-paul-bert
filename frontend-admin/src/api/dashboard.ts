import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type DashboardKpis = {
  total_students?: number
  total_teachers?: number
  total_classes?: number
}

export type AttendanceToday = {
  absences: number
  lates: number
  present: number
}

export type AttendanceDayPoint = { date: string; absences: number }

export type ClassAverageRow = {
  class_id: number
  class_name: string
  class_code: string | null
  average: number | null
}

export type DashboardAlert = {
  type: string
  id?: number
  severity: string
  title: string
  body: string | null
  read_at?: string | null
  created_at?: string | null
}

export type DashboardShortcut = {
  label: string
  path: string
  permission: string
}

export type UnpaidSummary = {
  unpaid_invoices: number
  unpaid_amount: number
  overdue_invoices: number
}

export type FinanceSummary = {
  revenue_total: number
  expenses_total: number
  net_total: number
  unpaid_total: number
}

export type PaymentMonthPoint = { period: string; total: number }

export type AnnouncementRow = {
  id: number
  title: string
  body: string | null
  published_at: string | null
}

export type DashboardPayload = {
  dashboard_kind: string
  role_code: string
  school_year_id: number | null
  kpis: DashboardKpis
  attendance_today: AttendanceToday | null
  attendance_last_7_days: AttendanceDayPoint[]
  averages_by_class: ClassAverageRow[]
  alerts: DashboardAlert[]
  unpaid: UnpaidSummary | null
  finance_summary: FinanceSummary | null
  payments_by_month: PaymentMonthPoint[]
  recent_announcements: AnnouncementRow[]
  shortcuts: DashboardShortcut[]
}

export async function fetchDashboard(params: {
  school_year_id?: number
} = {}): Promise<DashboardPayload> {
  const { data } = await apiClient.get<Ok<DashboardPayload> | Err>('/v1/dashboard', {
    params,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type SimpleDashboardKpis = {
  total_students: number
  new_registrations: number
  students_left: number
  registration_revenue: number
  monthly_revenue: number
  global_revenue: number
}

export type SimpleRevenuePoint = { key: string; label: string; amount: number }

export type SimpleDashboardPayload = {
  school_year: {
    id: number
    name: string
    start_date: string
    end_date: string
  } | null
  kpis: SimpleDashboardKpis
  revenue_trend: SimpleRevenuePoint[]
}

export async function fetchSimpleDashboard(params: {
  school_year_id?: number
} = {}): Promise<SimpleDashboardPayload> {
  const { data } = await apiClient.get<Ok<SimpleDashboardPayload> | Err>(
    '/v1/dashboard/simple',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}
