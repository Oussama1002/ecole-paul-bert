export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

export type ApiError = {
  success: false
  message: string
  errors: Record<string, string[]> | Record<string, never>
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError

export type AuthUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  username: string | null
  status: string
  gender?: string | null
  date_of_birth?: string | null
  address?: string | null
  last_login_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  role: {
    id: number
    name: string
    code: string
  } | null
}

export type UserListItem = AuthUser

export type PaginatedMeta = {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type Paginated<T> = {
  items: T[]
  meta: PaginatedMeta
}
