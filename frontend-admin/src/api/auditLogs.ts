import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type AuditLogRow = {
  id: number
  user_id: number | null
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
  } | null
  action: string
  subject_type: string | null
  subject_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string | null
}

export async function fetchAuditLogs(params: {
  page?: number
  per_page?: number
  action?: string
  user_id?: number
  from?: string
  to?: string
} = {}): Promise<Paginated<AuditLogRow>> {
  const { data } = await apiClient.get<Ok<Paginated<AuditLogRow>> | Err>(
    '/v1/audit-logs',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}
