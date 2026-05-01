import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect, type SearchSelectOption } from '../../components/ui/SearchSelect'
import { useAuth } from '../../contexts/AuthContext'
import { getApiErrorMessage } from '../../utils/apiError'

type StatusFilter = '' | 'draft' | 'issued' | 'partial' | 'paid' | 'cancelled'

type ItemDraft = {
  label: string
  amount: number
}

export function InvoicesListPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('finance.manage')
  const qc = useQueryClient()

  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [status, setStatus] = useState<StatusFilter>('')

  const [showForm, setShowForm] = useState(false)
  const [openInvoiceId, setOpenInvoiceId] = useState<number | null>(null)

  const [form, setForm] = useState({
    student_id: null as number | null,
    status: 'issued' as 'draft' | 'issued',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    discount_amount: 0,
    tax_amount: 0,
    notes: '',
    items: [{ label: '', amount: 0 }] as ItemDraft[],
  })
  const [error, setError] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-invoices'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId > 0) return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const filtersKey = ['invoices', schoolYearId, studentId, status] as const

  const { data, isLoading, isError, error: qerr, refetch } = useQuery({
    queryKey: filtersKey,
    queryFn: () =>
      financeApi.fetchInvoices({
        school_year_id: schoolYearId || undefined,
        student_id: studentId ?? undefined,
        status: status || undefined,
        per_page: 100,
      }),
    enabled: schoolYearId > 0,
  })

  const studentsQuery = useQuery({
    queryKey: ['invoice-students', schoolYearId],
    queryFn: () =>
      studentsApi.fetchStudents({
        school_year_id: schoolYearId || undefined,
        per_page: 500,
        sort_by: 'last_name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId > 0,
  })

  const studentOptions = useMemo<SearchSelectOption[]>(
    () =>
      (studentsQuery.data?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.last_name} ${s.first_name}`,
        hint: s.student_code,
      })),
    [studentsQuery.data?.items]
  )

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!schoolYearId) throw new Error('Année scolaire requise.')
      if (!form.student_id) throw new Error('Élève requis.')
      const items = form.items
        .map((it) => ({ ...it, amount: Number(it.amount) }))
        .filter((it) => it.label.trim() && it.amount > 0)
      if (items.length === 0) throw new Error('Au moins une ligne valide.')
      await financeApi.createInvoice({
        student_id: form.student_id as number,
        school_year_id: schoolYearId,
        status: form.status,
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        discount_amount: Number(form.discount_amount) || 0,
        tax_amount: Number(form.tax_amount) || 0,
        notes: form.notes || null,
        items,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setShowForm(false)
      setForm({
        student_id: null,
        status: 'issued',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        discount_amount: 0,
        tax_amount: 0,
        notes: '',
        items: [{ label: '', amount: 0 }],
      })
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Création de facture impossible.')),
  })

  const cancel = useMutation({
    mutationFn: async (vars: { id: number; reason: string }) =>
      financeApi.cancelInvoice(vars.id, vars.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const issue = useMutation({
    mutationFn: async (id: number) => financeApi.issueInvoice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const detail = useQuery({
    queryKey: ['invoice-detail', openInvoiceId],
    queryFn: () => financeApi.fetchInvoice(openInvoiceId as number),
    enabled: !!openInvoiceId,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Factures</h2>
          <p className="text-sm text-slate-500">
            Création, statuts (brouillon, émise, partielle, payée, annulée), PDF, paiements liés.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
          >
            {showForm ? 'Fermer' : '+ Nouvelle facture'}
          </button>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Field label="Année scolaire">
          <select
            value={schoolYearId || ''}
            onChange={(e) => setSchoolYearId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">—</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Élève (ID)">
          <SearchSelect
            value={studentId}
            onChange={setStudentId}
            options={studentOptions}
            placeholder="Rechercher un élève"
            disabled={schoolYearId <= 0}
            isLoading={studentsQuery.isLoading}
            isError={studentsQuery.isError}
            className="mt-1"
          />
        </Field>
        <Field label="Statut">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="issued">Émise</option>
            <option value="partial">Partielle</option>
            <option value="paid">Payée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </Field>
      </div>

      {showForm && canManage && (
        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Élève *">
              <SearchSelect
                value={form.student_id}
                onChange={(v) => setForm((f) => ({ ...f, student_id: v }))}
                options={studentOptions}
                placeholder="Rechercher un élève"
                disabled={schoolYearId <= 0}
                isLoading={studentsQuery.isLoading}
                isError={studentsQuery.isError}
                className="mt-1"
              />
            </Field>
            <Field label="Statut initial">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'issued' }))
                }
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="issued">Émise</option>
                <option value="draft">Brouillon</option>
              </select>
            </Field>
            <Field label="Date d’émission *">
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </Field>
            <Field label="Échéance">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </Field>
            <Field label="Remise / Taxes">
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Remise"
                  value={form.discount_amount || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discount_amount: Number(e.target.value) }))
                  }
                  className="w-1/2 rounded border border-slate-300 px-3 py-2"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Taxe"
                  value={form.tax_amount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, tax_amount: Number(e.target.value) }))}
                  className="w-1/2 rounded border border-slate-300 px-3 py-2"
                />
              </div>
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium text-slate-800">Lignes de facture</h4>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, items: [...f.items, { label: '', amount: 0 }] }))
                }
                className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-white"
              >
                + Ligne
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Libellé (ex. Mensualité Mars)"
                    value={it.label}
                    onChange={(e) =>
                      setForm((f) => {
                        const items = [...f.items]
                        items[idx] = { ...items[idx], label: e.target.value }
                        return { ...f, items }
                      })
                    }
                    className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Montant"
                    value={it.amount || ''}
                    onChange={(e) =>
                      setForm((f) => {
                        const items = [...f.items]
                        items[idx] = { ...items[idx], amount: Number(e.target.value) }
                        return { ...f, items }
                      })
                    }
                    className="w-32 rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          items: f.items.filter((_, i) => i !== idx),
                        }))
                      }
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              maxLength={2000}
              rows={2}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {create.isPending ? 'Création…' : 'Créer la facture'}
            </button>
          </div>
        </form>
      )}

      {schoolYearId === 0 && (
        <EmptyState
          emoji="🧾"
          title="Sélectionnez une année scolaire"
          hint="Choisissez une année pour afficher les factures."
        />
      )}

      {isLoading && <LoadingState label="Chargement des factures…" lines={4} />}
      {isError && (
        <ErrorState
          error={qerr}
          fallback="Impossible de charger les factures."
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Émission</th>
                <th className="px-4 py-3">Échéance</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Payé</th>
                <th className="px-4 py-3 text-right">Reste</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{inv.invoice_number ?? 'Sans numéro'}</td>
                  <td className="px-4 py-3">{inv.issue_date}</td>
                  <td className="px-4 py-3">{inv.due_date ?? '—'}</td>
                  <td className="px-4 py-3">{inv.student_name ?? 'Élève non identifié'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inv.total_amount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inv.amount_paid}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{inv.amount_due}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={inv.status} />
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      type="button"
                      onClick={() => setOpenInvoiceId(inv.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Détail
                    </button>
                    <button
                      type="button"
                      onClick={() => financeApi.downloadInvoicePdf(inv.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      PDF
                    </button>
                    {canManage && inv.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Émettre cette facture ?')) {
                            issue.mutate(inv.id)
                          }
                        }}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        Émettre
                      </button>
                    )}
                    {canManage && inv.status !== 'cancelled' && inv.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt('Motif d’annulation (optionnel) :', '')
                          if (reason !== null) {
                            cancel.mutate({ id: inv.id, reason })
                          }
                        }}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-3 text-slate-500">
                    <EmptyState
                      emoji="📄"
                      title="Aucune facture trouvée"
                      hint="Essayez un autre filtre ou créez une nouvelle facture."
                      action={
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void refetch()}
                            className="school-btn-secondary"
                          >
                            Réessayer
                          </button>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => setShowForm(true)}
                              className="school-btn-primary"
                            >
                              + Nouvelle facture
                            </button>
                          ) : null}
                        </div>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openInvoiceId && (
        <InvoiceDetailModal
          invoiceId={openInvoiceId}
          onClose={() => setOpenInvoiceId(null)}
          data={detail.data}
          loading={detail.isLoading}
        />
      )}
    </div>
  )
}

function InvoiceDetailModal({
  invoiceId,
  onClose,
  data,
  loading,
}: {
  invoiceId: number
  onClose: () => void
  data: financeApi.InvoiceDetail | undefined
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-800">
            Facture {data?.invoice_number ?? 'sans numéro'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 px-4 py-3 text-sm">
          {loading && <p className="text-slate-500">Chargement…</p>}
          {data && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Info
                  label="Élève"
                  value={
                    data.student
                      ? `${data.student.last_name} ${data.student.first_name}`
                      : data.student_name ?? 'Élève non identifié'
                  }
                />
                <Info label="Statut" value={data.status} />
                <Info label="Émission" value={data.issue_date ?? '—'} />
                <Info label="Échéance" value={data.due_date ?? '—'} />
                <Info label="Total" value={data.total_amount} />
                <Info label="Payé" value={data.amount_paid} />
                <Info label="Reste" value={data.amount_due} />
              </div>
              <div>
                <h4 className="mb-2 font-medium text-slate-800">Lignes</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2">Libellé</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items ?? []).map((it) => (
                      <tr key={it.id} className="border-b border-slate-100">
                        <td className="py-2">{it.label}</td>
                        <td className="py-2 text-right tabular-nums">{it.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => financeApi.downloadInvoicePdf(invoiceId)}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Télécharger PDF
                </button>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-slate-800">Paiements enregistrés</h4>
                {(data.payments ?? []).length === 0 ? (
                  <p className="text-slate-500">Aucun paiement confirmé sur cette facture.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="py-2">Référence</th>
                        <th className="py-2">Date</th>
                        <th className="py-2 text-right">Montant</th>
                        <th className="py-2">Statut</th>
                        <th className="py-2 text-right">Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.payments ?? []).map((pay) => (
                        <tr key={pay.id} className="border-b border-slate-100">
                          <td className="py-2">{pay.payment_reference ?? 'Sans référence'}</td>
                          <td className="py-2">{pay.payment_date ?? '—'}</td>
                          <td className="py-2 text-right tabular-nums">{pay.amount}</td>
                          <td className="py-2">{pay.status}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              disabled={!pay.has_receipt}
                              onClick={() => financeApi.downloadReceipt(pay.id)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
                            >
                              Télécharger
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    issued: 'bg-blue-100 text-blue-700',
    partial: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${map[status] ?? 'bg-slate-100'}`}>
      {status}
    </span>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-xs text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  )
}
