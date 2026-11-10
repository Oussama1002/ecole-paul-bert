import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

const STALE = 5 * 60_000 // 5 minutes — analytics change infrequently.

// ── Types ────────────────────────────────────────────────────────────────────

export type YearMeta = { year: string; school_year_id: number; is_current: boolean }

export type EnrollmentTrend = YearMeta & {
  total: number
  by_level: { level: string; total: number }[]
  by_gender: { M: number; F: number; O: number }
  new: number
  returning: number
}

export type FinanceMonthly = { month: string; invoiced: number; collected: number; expenses: number }
export type FinanceTrend = YearMeta & {
  invoiced: number
  collected: number
  collection_rate: number
  expenses: number
  net: number
  monthly: FinanceMonthly[]
}

export type AttendanceMonthly = { month: string; rate: number }
export type AttendanceTrend = YearMeta & {
  avg_rate: number
  total_absences: number
  total_lates: number
  monthly: AttendanceMonthly[]
}

export type GradeTrend = YearMeta & {
  avg_grade: number
  pass_rate: number
  by_level: { level: string; avg_grade: number }[]
  top_subjects: { subject: string; avg_grade: number }[]
  bottom_subjects: { subject: string; avg_grade: number }[]
}

export type TeacherTrend = YearMeta & {
  total: number
  student_teacher_ratio: number
  avg_classes: number
}

export type AnalyticsSummary = YearMeta & {
  enrollment_total: number
  collection_rate: number
  attendance_rate: number
  avg_grade: number
  pass_rate: number
  student_teacher_ratio: number
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const { data } = await apiClient.get<Ok<T> | Err>(url, { params })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export const fetchSummary = () => get<AnalyticsSummary[]>('/v1/analytics/summary')
export const fetchEnrollmentAnalytics = () => get<EnrollmentTrend[]>('/v1/analytics/enrollment')
export const fetchFinanceAnalytics = (year?: string) =>
  get<FinanceTrend[]>('/v1/analytics/finance', year ? { year } : undefined)
export const fetchAttendanceAnalytics = (year?: string) =>
  get<AttendanceTrend[]>('/v1/analytics/attendance', year ? { year } : undefined)
export const fetchGradeAnalytics = () => get<GradeTrend[]>('/v1/analytics/grades')
export const fetchTeacherAnalytics = () => get<TeacherTrend[]>('/v1/analytics/teachers')

// ── React Query hooks ────────────────────────────────────────────────────────

export const useAnalyticsSummary = () =>
  useQuery({ queryKey: ['analytics', 'summary'], queryFn: fetchSummary, staleTime: STALE })

export const useEnrollmentAnalytics = () =>
  useQuery({ queryKey: ['analytics', 'enrollment'], queryFn: fetchEnrollmentAnalytics, staleTime: STALE })

export const useFinanceAnalytics = (year?: string) =>
  useQuery({
    queryKey: ['analytics', 'finance', year ?? null],
    queryFn: () => fetchFinanceAnalytics(year),
    staleTime: STALE,
  })

export const useAttendanceAnalytics = (year?: string) =>
  useQuery({
    queryKey: ['analytics', 'attendance', year ?? null],
    queryFn: () => fetchAttendanceAnalytics(year),
    staleTime: STALE,
  })

export const useGradeAnalytics = () =>
  useQuery({ queryKey: ['analytics', 'grades'], queryFn: fetchGradeAnalytics, staleTime: STALE })

export const useTeacherAnalytics = () =>
  useQuery({ queryKey: ['analytics', 'teachers'], queryFn: fetchTeacherAnalytics, staleTime: STALE })
