import { apiClient } from './client'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type BulletinFieldItem = {
  key: string
  label: string
  enabled: boolean
}

export type BulletinSection = {
  key: string
  enabled: boolean
  label: string
  text?: string
  fields?: BulletinFieldItem[]
  columns?: BulletinFieldItem[]
}

export type BulletinSchool = {
  name: string
  address: string
  city: string
  logo_path: string | null
}

export type BulletinTemplate = {
  school: BulletinSchool
  title: string
  sections: BulletinSection[]
}

type TemplateEnvelope = {
  template: BulletinTemplate
  defaults?: BulletinTemplate
}

export async function fetchReportCardTemplate(): Promise<TemplateEnvelope> {
  const { data } = await apiClient.get<Ok<TemplateEnvelope> | Err>(
    '/v1/report-card-template'
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function saveReportCardTemplate(
  template: BulletinTemplate
): Promise<BulletinTemplate> {
  const { data } = await apiClient.put<Ok<{ template: BulletinTemplate }> | Err>(
    '/v1/report-card-template',
    template
  )
  if (!data.success) throw new Error(data.message)
  return data.data.template
}

export async function resetReportCardTemplate(): Promise<BulletinTemplate> {
  const { data } = await apiClient.post<Ok<{ template: BulletinTemplate }> | Err>(
    '/v1/report-card-template/reset'
  )
  if (!data.success) throw new Error(data.message)
  return data.data.template
}
