import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type NotificationCategory =
  | 'absence'
  | 'late'
  | 'payment_reminder'
  | 'payment_received'
  | 'announcement'
  | 'report_card'
  | 'general'

export type NotificationChannel = 'email' | 'sms' | 'in_app'

export type NotificationPreference = {
  category: NotificationCategory
  channel: NotificationChannel
  enabled: boolean
}

export type NotificationPreferencesPayload = {
  categories: NotificationCategory[]
  channels: NotificationChannel[]
  preferences: NotificationPreference[]
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferencesPayload> {
  const { data } = await apiClient.get<Ok<NotificationPreferencesPayload> | Err>(
    '/v1/notification-preferences'
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateNotificationPreferences(
  preferences: NotificationPreference[]
): Promise<NotificationPreferencesPayload> {
  const { data } = await apiClient.patch<Ok<NotificationPreferencesPayload> | Err>(
    '/v1/notification-preferences',
    { preferences }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type NotificationTestResult = {
  channels: string[]
  email: string | null
  phone: string | null
  queued: boolean
}

export async function sendTestNotification(): Promise<NotificationTestResult> {
  const { data } = await apiClient.post<Ok<NotificationTestResult> | Err>(
    '/v1/notifications/test'
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type NotificationLogRow = {
  id: number
  notifiable_type: string
  notifiable_id: number
  recipient: string | null
  notification_type: string
  channel: NotificationChannel
  status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  sent_at: string | null
  created_at: string | null
}

export async function fetchNotificationLogs(params: {
  page?: number
  per_page?: number
  status?: string
  channel?: string
  from?: string
  to?: string
} = {}): Promise<Paginated<NotificationLogRow>> {
  const { data } = await apiClient.get<Ok<Paginated<NotificationLogRow>> | Err>(
    '/v1/notification-logs',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}
