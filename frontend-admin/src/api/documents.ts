import { apiClient } from './client'
import type { Paginated } from '../types/api'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type Document = {
  id: number
  category: string | null
  document_type: string | null
  title: string | null
  description: string | null
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  visibility_scope: string | null
  is_confidential: boolean
  status: string | null
  student_id: number | null
  teacher_id: number | null
  invoice_id: number | null
  payment_id: number | null
  expense_id: number | null
  uploaded_by: number | null
  created_at: string | null
}

export async function fetchDocuments(params: {
  category?: string
  document_type?: string
  student_id?: number
  teacher_id?: number
  invoice_id?: number
  payment_id?: number
  expense_id?: number
  per_page?: number
  page?: number
} = {}): Promise<Paginated<Document>> {
  const { data } = await apiClient.get<Ok<Paginated<Document>> | Err>('/v1/documents', {
    params,
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function uploadDocument(payload: {
  file: File
  category?: string
  document_type?: string
  title?: string
  description?: string
  visibility_scope?: string
  is_confidential?: boolean
  student_id?: number
  teacher_id?: number
  invoice_id?: number
  payment_id?: number
  expense_id?: number
}): Promise<Document> {
  const form = new FormData()
  form.append('file', payload.file)
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'file') continue
    if (v === undefined || v === null || v === '') continue
    form.append(k, String(v))
  }
  const { data } = await apiClient.post<Ok<Document> | Err>('/v1/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function downloadDocument(id: number): Promise<void> {
  try {
    const res = await apiClient.get<Blob>(`/v1/documents/${id}/download`, {
      responseType: 'blob',
    })
    const blob = res.data
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `document_${id}`
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (err) {
    throw new Error(await readBlobErrorMessage(err))
  }
}

async function readBlobErrorMessage(err: unknown): Promise<string> {
  // axios errors with responseType 'blob' put the JSON body inside a Blob.
  const anyErr = err as { response?: { status?: number; data?: unknown } }
  const status = anyErr?.response?.status
  const data = anyErr?.response?.data
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed?.message) return parsed.message
    } catch {
      /* fall through */
    }
  }
  if (status === 403) return 'Accès refusé : ce document est confidentiel.'
  if (status === 404) return 'Document introuvable.'
  return 'Téléchargement impossible.'
}

export async function previewDocumentBlob(id: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/v1/documents/${id}/download`, {
    responseType: 'blob',
  })
  return res.data
}

export async function deleteDocument(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/documents/${id}`)
  if (!data.success) throw new Error(data.message)
}

