import { apiClient } from './client'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type FinanceEntryType = 'income' | 'expense'
export type FinanceCostType = 'fixed' | 'variable'

export type FinanceJournalEntry = {
  id: number
  entry_date: string
  entry_type: FinanceEntryType
  cost_type: FinanceCostType | null
  category: string | null
  label: string
  amount: string // decimal from backend; parse with parseFloat when needed
  note: string | null
  attachment_name?: string | null
  has_attachment?: boolean
  created_by: number | null
  deleted_at?: string | null
}

export type JournalListParams = {
  month?: string
  from?: string
  to?: string
  entry_type?: FinanceEntryType
  cost_type?: FinanceCostType
  include_deleted?: boolean
  per_page?: number
}

export type JournalList = {
  items: FinanceJournalEntry[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export async function fetchJournal(params: JournalListParams = {}): Promise<JournalList> {
  const { data } = await apiClient.get<Ok<JournalList> | Err>(
    '/v1/simple/finance/journal',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type FinanceSummary = {
  month: string
  month_totals: Totals
  year: number
  year_totals: Totals
  global_totals: Totals
  invoice_unpaid: { count: number; amount: number }
}

export type Totals = {
  income: number
  fixed_expense: number
  variable_expense: number
  other_expense: number
  total_expense: number
  net: number
}

export async function fetchSummary(month?: string): Promise<FinanceSummary> {
  const { data } = await apiClient.get<Ok<FinanceSummary> | Err>(
    '/v1/simple/finance/summary',
    { params: month ? { month } : {} }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type JournalPayload = {
  entry_date: string
  entry_type: FinanceEntryType
  cost_type?: FinanceCostType | null
  category?: string | null
  label: string
  amount: number
  note?: string | null
  attachment?: File | null
}

export async function createJournalEntry(
  payload: JournalPayload
): Promise<FinanceJournalEntry> {
  const body = toJournalBody(payload)
  const { data } = await apiClient.post<Ok<FinanceJournalEntry> | Err>(
    '/v1/simple/finance/journal',
    body,
    formDataConfig(body)
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateJournalEntry(
  id: number,
  payload: Partial<JournalPayload>
): Promise<FinanceJournalEntry> {
  const body = toJournalBody(payload)
  const { data } = await apiClient.patch<Ok<FinanceJournalEntry> | Err>(
    `/v1/simple/finance/journal/${id}`,
    body,
    formDataConfig(body)
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function deleteJournalEntry(id: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(
    `/v1/simple/finance/journal/${id}`
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
}

export async function exportJournalCsv(params: JournalListParams = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/simple/finance/journal/export.csv', {
    params,
    responseType: 'blob',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(res.data)
  a.download = 'journal_finance.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export type SimpleBilanPeriodType = 'monthly' | 'yearly' | 'custom'

export type SimpleBilanParams = {
  period_type?: SimpleBilanPeriodType
  date_from?: string
  date_to?: string
}

export type SimpleBilanEvolutionRow = {
  month: number
  month_label: string
  income: number
  expenses: number
  net_balance: number
}

export type SimpleBilan = {
  source: 'journal'
  period: { type: string; date_from: string; date_to: string; label: string }
  summary: {
    total_income: number
    total_expenses: number
    net_balance: number
    fixed_expense: number
    variable_expense: number
  }
  monthly_evolution: SimpleBilanEvolutionRow[]
}

export async function fetchSimpleBilan(params: SimpleBilanParams = {}): Promise<SimpleBilan> {
  const { data } = await apiClient.get<Ok<SimpleBilan> | Err>(
    '/v1/simple/finance/bilan',
    { params }
  )
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function downloadJournalAttachment(id: number): Promise<void> {
  const res = await apiClient.get<Blob>(`/v1/simple/finance/journal/${id}/attachment`, {
    responseType: 'blob',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(res.data)
  a.download = `piece-journal-${id}`
  a.click()
  URL.revokeObjectURL(a.href)
}

function toJournalBody(payload: Partial<JournalPayload>): Partial<JournalPayload> | FormData {
  if (!payload.attachment) return payload

  const fd = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    if (key === 'attachment' && value instanceof File) {
      fd.append('attachment', value)
      continue
    }
    fd.append(key, String(value))
  }
  return fd
}

function formDataConfig(body: Partial<JournalPayload> | FormData) {
  if (!(body instanceof FormData)) return undefined
  return {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }
}
