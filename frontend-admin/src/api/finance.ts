import { apiClient } from './client'
import type { Paginated } from '../types/api'
import { messageFromFailedApiPayload } from '../utils/apiError'

type Ok<T> = { success: true; message: string; data: T }
type Err = { success: false; message: string; errors: Record<string, string[]> }

export type FeeType = {
  id: number
  name: string
  code: string
  frequency: string
  default_amount: string
  is_active: boolean
  description: string | null
}

export async function fetchFeeTypes(params: {
  is_active?: boolean
  per_page?: number
  page?: number
} = {}): Promise<Paginated<FeeType>> {
  const { data } = await apiClient.get<Ok<Paginated<FeeType>> | Err>('/v1/fee-types', {
    params,
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type ExpenseCategory = {
  id: number
  name: string
  code: string
  is_active: boolean
  description: string | null
}

export async function fetchExpenseCategories(params: {
  is_active?: boolean
  per_page?: number
  page?: number
} = {}): Promise<Paginated<ExpenseCategory>> {
  const { data } = await apiClient.get<Ok<Paginated<ExpenseCategory>> | Err>(
    '/v1/expense-categories',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type FeeAssignment = {
  id: number
  student_id: number
  school_year_id: number
  fee_type_id: number
  amount_due: string
  discount_amount: string
  scholarship_amount: string
  amount_paid: string
  balance: string
  status: string
  due_date: string | null
}

export async function fetchFeeAssignments(params: {
  student_id?: number
  school_year_id?: number
  status?: string
  per_page?: number
  page?: number
} = {}): Promise<Paginated<FeeAssignment>> {
  const { data } = await apiClient.get<Ok<Paginated<FeeAssignment>> | Err>(
    '/v1/fee-assignments',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export type Invoice = {
  id: number
  student_id: number
  student_name?: string | null
  school_year_id: number
  invoice_number: string | null
  status: string
  issue_date: string
  due_date: string | null
  subtotal: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  amount_paid: string
  amount_due: string
}

export async function fetchInvoices(params: {
  student_id?: number
  school_year_id?: number
  status?: string
  per_page?: number
  page?: number
} = {}): Promise<Paginated<Invoice>> {
  const { data } = await apiClient.get<Ok<Paginated<Invoice>> | Err>('/v1/invoices', {
    params,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type Payment = {
  id: number
  student_id: number
  student_name?: string | null
  school_year_id: number
  invoice_id: number | null
  invoice_number?: string | null
  fee_assignment_id: number | null
  payment_reference: string | null
  payment_date: string
  amount: string
  payment_method: string
  status: string
  has_receipt: boolean
}

export async function fetchPayments(params: {
  student_id?: number
  school_year_id?: number
  invoice_id?: number
  status?: string
  per_page?: number
  page?: number
} = {}): Promise<Paginated<Payment>> {
  const { data } = await apiClient.get<Ok<Paginated<Payment>> | Err>('/v1/payments', {
    params,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createPayment(payload: {
  student_id: number
  school_year_id: number
  payment_date: string
  amount: number
  payment_method: string
  transaction_reference?: string | null
  invoice_id?: number | null
  fee_assignment_id?: number | null
  note?: string | null
}): Promise<Payment> {
  const { data } = await apiClient.post<Ok<Payment> | Err>('/v1/payments', payload)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createFeeAssignment(payload: {
  student_id: number
  school_year_id: number
  fee_type_id: number
  amount_due: number
  due_date?: string | null
  notes?: string | null
}): Promise<FeeAssignment> {
  const { data } = await apiClient.post<Ok<FeeAssignment> | Err>('/v1/fee-assignments', payload)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function downloadReceipt(paymentId: number): Promise<void> {
  const res = await apiClient.get<Blob>(`/v1/payments/${paymentId}/receipt`, {
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `recu_${paymentId}.pdf`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function fetchFinanceDashboard(params: {
  school_year_id?: number
  from?: string
  to?: string
} = {}): Promise<{
  revenue_total: number
  expenses_total: number
  net_total: number
  unpaid_total: number
}> {
  const { data } = await apiClient.get<Ok<unknown> | Err>('/v1/finance/dashboard', {
    params,
  })
  if (!data.success) throw new Error(data.message)
  return data.data as {
    revenue_total: number
    expenses_total: number
    net_total: number
    unpaid_total: number
  }
}

export async function downloadPaymentsExport(params: {
  school_year_id?: number
  from?: string
  to?: string
} = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/finance/payments/export.xlsx', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `paiements_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadExpensesExport(params: {
  school_year_id?: number
  from?: string
  to?: string
} = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/finance/expenses/export.xlsx', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `depenses_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadFinanceSummaryPdf(params: {
  school_year_id?: number
  from?: string
  to?: string
} = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/finance/summary/report.pdf', {
    params,
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `rapport_finance_${new Date().toISOString().slice(0, 10)}.pdf`
  a.click()
  URL.revokeObjectURL(a.href)
}

export type Expense = {
  id: number
  school_year_id: number | null
  expense_category_id: number
  expense_date: string
  amount: string
  cost_type: 'fixed' | 'variable'
  vendor: string | null
  reference: string | null
  description: string | null
  status: 'active' | 'cancelled'
  cancelled_at: string | null
}

export type ExpenseDocument = {
  id: number
  title: string
  file_path: string
  mime_type?: string
  file_size?: number
  created_at?: string
}

export async function fetchExpenses(params: {
  school_year_id?: number
  expense_category_id?: number
  cost_type?: 'fixed' | 'variable'
  status?: 'active' | 'cancelled'
  from?: string
  to?: string
  per_page?: number
  page?: number
} = {}): Promise<Paginated<Expense>> {
  const { data } = await apiClient.get<Ok<Paginated<Expense>> | Err>('/v1/expenses', {
    params,
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchExpense(id: number): Promise<Expense & { documents?: ExpenseDocument[] }> {
  const { data } = await apiClient.get<Ok<Expense & { documents?: ExpenseDocument[] }> | Err>(
    `/v1/expenses/${id}`
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function fetchNextExpenseReference(): Promise<string> {
  const { data } = await apiClient.get<Ok<{ reference: string }> | Err>('/v1/expenses/next-reference')
  if (!data.success) throw new Error(data.message)
  return data.data.reference
}

export async function createExpense(payload: {
  expense_category_id: number
  expense_date: string
  amount: number
  cost_type?: 'fixed' | 'variable'
  school_year_id?: number | null
  vendor?: string | null
  reference?: string | null
  description?: string | null
}): Promise<Expense> {
  const { data } = await apiClient.post<Ok<Expense> | Err>('/v1/expenses', payload)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function updateExpense(
  id: number,
  payload: Partial<{
    expense_category_id: number
    expense_date: string
    amount: number
    cost_type: 'fixed' | 'variable'
    school_year_id: number | null
    vendor: string | null
    reference: string | null
    description: string | null
  }>
): Promise<Expense> {
  const { data } = await apiClient.patch<Ok<Expense> | Err>(`/v1/expenses/${id}`, payload)
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function cancelExpense(id: number, reason?: string): Promise<Expense> {
  const { data } = await apiClient.post<Ok<Expense> | Err>(`/v1/expenses/${id}/cancel`, {
    reason,
  })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function uploadExpenseDocument(
  expenseId: number,
  file: File,
  meta: { title?: string; document_type?: string; description?: string } = {}
): Promise<ExpenseDocument> {
  const fd = new FormData()
  fd.append('file', file)
  if (meta.title) fd.append('title', meta.title)
  if (meta.document_type) fd.append('document_type', meta.document_type)
  if (meta.description) fd.append('description', meta.description)
  const { data } = await apiClient.post<Ok<ExpenseDocument> | Err>(
    `/v1/expenses/${expenseId}/documents`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function deleteExpenseDocument(documentId: number): Promise<void> {
  const { data } = await apiClient.delete<Ok<null> | Err>(`/v1/expense-documents/${documentId}`)
  if (!data.success) throw new Error(data.message)
}

export type InvoiceItemPayload = {
  label: string
  amount: number
  fee_assignment_id?: number | null
}

export type InvoiceDetail = Invoice & {
  student?: {
    id: number
    first_name: string
    last_name: string
  } | null
  items?: { id: number; label: string; amount: string; fee_assignment_id: number | null }[]
  payments?: {
    id: number
    payment_reference: string | null
    payment_date: string | null
    amount: string
    status: string
    has_receipt: boolean
  }[]
}

export async function fetchInvoice(id: number): Promise<InvoiceDetail> {
  const { data } = await apiClient.get<Ok<InvoiceDetail> | Err>(`/v1/invoices/${id}`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function issueInvoice(id: number): Promise<InvoiceDetail> {
  const { data } = await apiClient.post<Ok<InvoiceDetail> | Err>(`/v1/invoices/${id}/issue`)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function createInvoice(payload: {
  student_id: number
  school_year_id: number
  status?: 'draft' | 'issued'
  issue_date: string
  due_date?: string | null
  discount_amount?: number
  tax_amount?: number
  notes?: string | null
  items: InvoiceItemPayload[]
}): Promise<InvoiceDetail> {
  const { data } = await apiClient.post<Ok<InvoiceDetail> | Err>('/v1/invoices', payload)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function updateInvoice(
  id: number,
  payload: {
    student_id?: number | null
    issue_date?: string | null
    due_date?: string | null
    notes?: string | null
    discount_amount?: number
    tax_amount?: number
    items?: InvoiceItemPayload[]
  }
): Promise<InvoiceDetail> {
  const { data } = await apiClient.patch<Ok<InvoiceDetail> | Err>(`/v1/invoices/${id}`, payload)
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export async function cancelInvoice(id: number, reason?: string): Promise<InvoiceDetail> {
  const { data } = await apiClient.post<Ok<InvoiceDetail> | Err>(`/v1/invoices/${id}/cancel`, {
    reason,
  })
  if (!data.success) throw new Error(messageFromFailedApiPayload(data))
  return data.data
}

export type ExpenseByCategory = {
  expense_category_id: number
  name: string
  total: number
  count: number
}

export async function fetchExpensesByCategory(params: {
  school_year_id?: number
  from?: string
  to?: string
} = {}): Promise<ExpenseByCategory[]> {
  const { data } = await apiClient.get<Ok<{ items: ExpenseByCategory[] }> | Err>(
    '/v1/finance/expenses-by-category',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data.items
}

export async function fetchExpensesByCostType(params: {
  school_year_id?: number
  from?: string
  to?: string
} = {}): Promise<{
  fixed_total: number
  fixed_count: number
  variable_total: number
  variable_count: number
}> {
  const { data } = await apiClient.get<Ok<unknown> | Err>(
    '/v1/finance/expenses-by-cost-type',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data as {
    fixed_total: number
    fixed_count: number
    variable_total: number
    variable_count: number
  }
}

export type OverdueInvoice = {
  id: number
  invoice_number: string | null
  student_id: number
  student_name: string | null
  issue_date: string | null
  due_date: string | null
  days_overdue: number | null
  total_amount: string
  amount_paid: string
  amount_due: string
  status: string
}

export async function fetchOverdueInvoices(params: {
  school_year_id?: number
  as_of?: string
  per_page?: number
} = {}): Promise<{
  total_overdue: number
  count_overdue: number
  as_of: string
  items: OverdueInvoice[]
}> {
  const { data } = await apiClient.get<Ok<unknown> | Err>(
    '/v1/finance/invoices/overdue',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data as {
    total_overdue: number
    count_overdue: number
    as_of: string
    items: OverdueInvoice[]
  }
}

export type MonthlyEvolutionItem = {
  period: string
  month: number
  revenue: number
  expenses: number
  net: number
}

export type BilanIncomeRow = {
  category: string
  label: string
  total_amount: number
  entries_count: number
}

export type BilanExpenseRow = {
  category: string
  label: string
  cost_group: 'fixed' | 'variable'
  total_amount: number
  entries_count: number
}

export type BilanMonthlyRow = {
  month: number
  month_label: string
  income: number
  expenses: number
  net_balance: number
}

export type FinanceBilan = {
  period: {
    type: 'monthly' | 'yearly' | 'custom'
    date_from: string
    date_to: string
    school_year_id: number | null
    label: string
  }
  summary: {
    total_income: number
    total_expenses: number
    net_balance: number
    registrations_revenue: number
    monthly_fees_revenue: number
    other_income_revenue: number
    unpaid_invoices_total: number
    partial_payments_total: number
    registered_students_count: number
    new_registrations_count: number
    students_left_count: number
  }
  income_breakdown: BilanIncomeRow[]
  expense_breakdown: BilanExpenseRow[]
  monthly_evolution: BilanMonthlyRow[]
}

export async function fetchFinanceBilan(params: {
  school_year_id?: number
  date_from?: string
  date_to?: string
  period_type?: 'monthly' | 'yearly' | 'custom'
} = {}): Promise<FinanceBilan> {
  const { data } = await apiClient.get<Ok<FinanceBilan> | Err>('/v1/finance/bilan', { params })
  if (!data.success) throw new Error(data.message)
  return data.data
}

export async function downloadFinanceBilanPdf(params: {
  school_year_id?: number
  date_from?: string
  date_to?: string
  period_type?: 'monthly' | 'yearly' | 'custom'
} = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/finance/bilan/pdf', { params, responseType: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(res.data)
  a.download = `bilan_financier_${new Date().toISOString().slice(0, 10)}.pdf`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadFinanceBilanExcel(params: {
  school_year_id?: number
  date_from?: string
  date_to?: string
  period_type?: 'monthly' | 'yearly' | 'custom'
} = {}): Promise<void> {
  const res = await apiClient.get<Blob>('/v1/finance/bilan/export.xlsx', { params, responseType: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(res.data)
  a.download = `bilan_financier_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function fetchMonthlyEvolution(params: {
  school_year_id?: number
  year?: number
} = {}): Promise<{ year: number; items: MonthlyEvolutionItem[] }> {
  const { data } = await apiClient.get<Ok<unknown> | Err>(
    '/v1/finance/monthly-evolution',
    { params }
  )
  if (!data.success) throw new Error(data.message)
  return data.data as { year: number; items: MonthlyEvolutionItem[] }
}

export async function downloadInvoicePdf(invoiceId: number): Promise<void> {
  const res = await apiClient.get<Blob>(`/v1/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  })
  const blob = res.data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `facture_${invoiceId}.pdf`
  a.click()
  URL.revokeObjectURL(a.href)
}

