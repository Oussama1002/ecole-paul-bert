import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Room = {
  id: number
  name: string
  code: string
  room_type: string
  capacity: number | null
  location: string | null
  status: string
  notes: string | null
  created_at?: string | null
  updated_at?: string | null
}

export async function fetchRooms(params: {
  page?: number
  per_page?: number
  search?: string
  room_type?: string
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}): Promise<Paginated<Room>> {
  const { data } = await apiClient.get<Ok<Paginated<Room>> | Err>('/v1/rooms', {
    params,
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchRoom(id: number): Promise<Room> {
  const { data } = await apiClient.get<Ok<Room> | Err>(`/v1/rooms/${id}`)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function createRoom(payload: {
  name: string
  code: string
  room_type: string
  capacity?: number | null
  location?: string | null
  status?: string
  notes?: string | null
}): Promise<Room> {
  const { data } = await apiClient.post<Ok<Room> | Err>('/v1/rooms', payload)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateRoom(
  id: number,
  payload: Partial<{
    name: string
    code: string
    room_type: string
    capacity: number | null
    location: string | null
    status: string
    notes: string | null
  }>
): Promise<Room> {
  const { data } = await apiClient.patch<Ok<Room> | Err>(
    `/v1/rooms/${id}`,
    payload
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteRoom(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/rooms/${id}`)
  if (!data.success) throw new Error(data.message)
}
