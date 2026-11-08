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

// ── Upgraded KPI endpoint (GET /v1/dashboard/kpis) ──────────────────────────

export type KpiLevelCount = { level: string; count: number }

export type KpiEnrollment = {
  total_students: number
  new_this_month: number
  /** Percent change vs last month. */
  trend_vs_last_month: number
  by_level: KpiLevelCount[]
}

export type KpiAttendance = {
  rate_this_week: number
  rate_last_week: number
  absences_today: number
  lates_today: number
  /** Difference in percentage points vs last week. */
  trend_vs_last_week: number
}

export type KpiFinance = {
  unpaid_invoices_count: number
  unpaid_invoices_total: number
  payments_this_month: number
  payments_last_month: number
  collection_rate: number
  /** Percent change vs last month. */
  trend_vs_last_month: number
  expenses_this_month: number
}

export type KpiTeachers = {
  total_active: number
  present_today: number
}

export type KpiActivity = {
  type: string
  message: string
  timestamp: string | null
}

export type DashboardKpiPayload = {
  school_year: { id: number; name: string } | null
  enrollment: KpiEnrollment
  attendance: KpiAttendance
  finance: KpiFinance
  teachers: KpiTeachers
  recent_activity: KpiActivity[]
}

export async function fetchDashboardKpis(params: {
  school_year_id?: number
} = {}): Promise<DashboardKpiPayload> {
  const { data } = await apiClient.get<Ok<DashboardKpiPayload> | Err>(
    '/v1/dashboard/kpis',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}
