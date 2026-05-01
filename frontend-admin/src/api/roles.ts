import { apiClient } from './client'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type RoleOption = {
  id: number
  name: string
  code: string
}

export async function fetchRoles(): Promise<RoleOption[]> {
  const { data } = await apiClient.get<Ok<RoleOption[]> | Err>('/v1/roles')
  if (!data.success) {
    throw new Error(data.message)
  }
  return data.data
}
