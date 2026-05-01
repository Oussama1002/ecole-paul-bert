import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type InternalNotification = {
  id: number
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string | null
}

export type IndicatorsPayload = {
  unread_notifications: number
}

export async function fetchNotificationIndicators(): Promise<IndicatorsPayload> {
  const { data } = await apiClient.get<Ok<IndicatorsPayload> | Err>(
    '/v1/dashboard/indicators'
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchNotifications(params: {
  page?: number
  per_page?: number
  unread_only?: boolean
} = {}): Promise<Paginated<InternalNotification>> {
  const { data } = await apiClient.get<
    Ok<Paginated<InternalNotification>> | Err
  >('/v1/internal-notifications', { params })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function markNotificationRead(id: number): Promise<void> {
  const { data } = await apiClient.post<Ok<null> | Err>(
    `/v1/internal-notifications/${id}/read`
  )
  if (!data.success) throw new Error(data.message)
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data } = await apiClient.post<Ok<null> | Err>(
    '/v1/internal-notifications/read-all'
  )
  if (!data.success) throw new Error(data.message)
}
