import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Announcement = {
  id: number
  title: string
  content: string
  audience_type: string
  class_id: number | null
  start_date: string | null
  end_date: string | null
  priority: string
  published_by: number | null
  status: string
  created_at: string | null
  updated_at: string | null
}

export async function fetchAnnouncements(params: {
  page?: number
  per_page?: number
  status?: string
  audience_type?: string
} = {}): Promise<Paginated<Announcement>> {
  const { data } = await apiClient.get<Ok<Paginated<Announcement>> | Err>(
    '/v1/announcements',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchAnnouncement(id: number): Promise<Announcement> {
  const { data } = await apiClient.get<Ok<Announcement> | Err>(
    `/v1/announcements/${id}`
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function createAnnouncement(payload: {
  title: string
  content: string
  audience_type: string
  class_id?: number | null
  start_date?: string | null
  end_date?: string | null
  priority?: string
  status?: string
}): Promise<Announcement> {
  const { data } = await apiClient.post<Ok<Announcement> | Err>(
    '/v1/announcements',
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateAnnouncement(
  id: number,
  payload: Partial<{
    title: string
    content: string
    audience_type: string
    class_id: number | null
    start_date: string | null
    end_date: string | null
    priority: string
    status: string
  }>
): Promise<Announcement> {
  const { data } = await apiClient.patch<Ok<Announcement> | Err>(
    `/v1/announcements/${id}`,
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function publishAnnouncement(id: number): Promise<Announcement> {
  const { data } = await apiClient.post<Ok<Announcement> | Err>(
    `/v1/announcements/${id}/publish`
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function archiveAnnouncement(id: number): Promise<Announcement> {
  const { data } = await apiClient.post<Ok<Announcement> | Err>(
    `/v1/announcements/${id}/archive`
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/announcements/${id}`
  )
  if (!data.success) throw new Error(data.message)
}
