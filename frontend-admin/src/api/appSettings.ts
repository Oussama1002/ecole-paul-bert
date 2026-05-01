import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type AppSettings = {
  simple_mode_enabled: boolean
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const { data } = await apiClient.get<Ok<AppSettings> | Err>('/v1/app-settings')
  if (!data.success) {
    throw new Error(messageFromFailedApiPayload(data))
  }
  return data.data
}

export async function updateAppSettings(
  payload: Partial<AppSettings>
): Promise<AppSettings> {
  const { data } = await apiClient.patch<Ok<AppSettings> | Err>(
    '/v1/app-settings',
    payload
  )
  if (!data.success) {
    throw new Error(messageFromFailedApiPayload(data))
  }
  return data.data
}
