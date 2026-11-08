import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type ImportType = 'students' | 'teachers'

export type ImportRowError = {
  row: number
  field: string
  message: string
}

export type ImportCredential = {
  name: string
  email: string
  password: string
}

export type ImportResult = {
  inserted: number
  skipped: number
  errors: ImportRowError[]
  /** Only returned by the teachers import. */
  credentials?: ImportCredential[]
}

/**
 * Upload a CSV/Excel file to the students or teachers import endpoint.
 */
export async function runImport(type: ImportType, file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<Ok<ImportResult> | Err>(
    `/v1/${type}/import`,
    form
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

/**
 * Download the Excel import template (headers + one example row).
 */
export async function downloadImportTemplate(type: ImportType): Promise<void> {
  const res = await apiClient.post<Blob>(
    `/v1/imports/template/${type}`,
    null,
    { responseType: 'blob' }
  )
  const a = document.createElement('a')
  a.href = URL.createObjectURL(res.data)
  a.download = `modele_import_${type}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}
