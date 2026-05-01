import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect, type SearchSelectOption } from '../../components/ui/SearchSelect'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { getApiErrorMessage } from '../../utils/apiError'

export function PaymentsListPage() {
  const { simpleMode } = useSimpleMode()
  const qc = useQueryClient()
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [invoiceId, setInvoiceId] = useState<number | null>(null)

  const [formStudentId, setFormStudentId] = useState<number | null>(null)
  const [formInvoiceId, setFormInvoiceId] = useState<number | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState<string>('cash')
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [createdPaymentId, setCreatedPaymentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-payments'],
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

  const { data, isLoading, isError, error: qerr, refetch } = useQuery({
    queryKey: ['payments', schoolYearId, studentId, invoiceId],
    queryFn: () =>
      financeApi.fetchPayments({
        school_year_id: schoolYearId || undefined,
        student_id: studentId ?? undefined,
        invoice_id: invoiceId ?? undefined,
        per_page: 100,
      }),
    enabled: schoolYearId > 0,
  })

  const studentsQuery = useQuery({
    queryKey: ['payments-students', schoolYearId],
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

  const allInvoicesForFilter = useQuery({
    queryKey: ['payments-invoices-filter', schoolYearId, studentId],
    queryFn: () =>
      financeApi.fetchInvoices({
        school_year_id: schoolYearId || undefined,
        student_id: studentId ?? undefined,
        per_page: 200,
      }),
    enabled: schoolYearId > 0 && studentId !== null,
  })

  const invoiceFilterOptions = useMemo<SearchSelectOption[]>(
    () =>
      (allInvoicesForFilter.data?.items ?? []).map((inv) => ({
        value: inv.id,
        label: inv.invoice_number ?? 'Facture sans numéro',
        hint: `Reste ${inv.amount_due} · Statut ${inv.status}`,
      })),
    [allInvoicesForFilter.data?.items]
  )

  const invoicesForPayment = useQuery({
    queryKey: ['payments-invoices-form', schoolYearId, formStudentId],
    queryFn: () =>
      financeApi.fetchInvoices({
        school_year_id: schoolYearId || undefined,
        student_id: formStudentId ?? undefined,
        per_page: 200,
      }),
    enabled: schoolYearId > 0 && formStudentId !== null,
  })

  const outstandingInvoices = useMemo(
    () =>
      (invoicesForPayment.data?.items ?? []).filter(
        (inv) => Number(inv.amount_due) > 0 && inv.status !== 'cancelled'
      ),
    [invoicesForPayment.data?.items]
  )

  const outstandingInvoiceOptions = useMemo<SearchSelectOption[]>(
    () =>
      outstandingInvoices.map((inv) => ({
        value: inv.id,
        label: inv.invoice_number ?? 'Facture sans numéro',
        hint: `Reste ${inv.amount_due} / Total ${inv.total_amount}`,
      })),
    [outstandingInvoices]
  )

  const selectedOutstandingInvoice = useMemo(
    () => outstandingInvoices.find((x) => x.id === formInvoiceId) ?? null,
    [outstandingInvoices, formInvoiceId]
  )

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!schoolYearId || !formStudentId || !formInvoiceId || !amount) {
        throw new Error('Sélectionnez année, élève, facture et montant.')
      }
      return financeApi.createPayment({
        school_year_id: schoolYearId,
        student_id: formStudentId as number,
        invoice_id: formInvoiceId as number,
        payment_date: date,
        amount,
        payment_method: method,
      })
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setCreatedPaymentId(created.id)
      setAmount(0)
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Création du paiement impossible.')),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Paiements</h2>
          <p className="text-sm text-slate-500">
            Flux de paiement guidé: élève → facture restante → montant → reçu.
          </p>
        </div>
      </div>

      <div
        className={`grid gap-3 rounded-lg border border-slate-200 bg-white p-4 ${
          simpleMode ? 'md:grid-cols-2' : 'md:grid-cols-3'
        }`}
      >
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Année scolaire</span>
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
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Filtre élève</span>
          <SearchSelect
            value={studentId}
            onChange={(v) => {
              setStudentId(v)
              setInvoiceId(null)
            }}
            options={studentOptions}
            placeholder="Rechercher un élève"
            disabled={schoolYearId <= 0}
            isLoading={studentsQuery.isLoading}
            isError={studentsQuery.isError}
            className="mt-1"
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs text-slate-500">Filtre facture</span>
          <SearchSelect
            value={invoiceId}
            onChange={setInvoiceId}
            options={invoiceFilterOptions}
            placeholder="Rechercher une facture"
            disabled={schoolYearId <= 0 || studentId === null}
            isLoading={allInvoicesForFilter.isLoading}
            isError={allInvoicesForFilter.isError}
            className="mt-1"
          />
        </label>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <div className="md:col-span-6">
          <h3 className="font-medium text-slate-800">Nouveau paiement</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs text-slate-500">1) Élève</span>
          <SearchSelect
            value={formStudentId}
            onChange={(v) => {
              setFormStudentId(v)
              setFormInvoiceId(null)
              setCreatedPaymentId(null)
            }}
            options={studentOptions}
            placeholder="Rechercher un élève"
            disabled={schoolYearId <= 0}
            isLoading={studentsQuery.isLoading}
            isError={studentsQuery.isError}
            className="mt-1"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs text-slate-500">2) Facture à régler</span>
          <SearchSelect
            value={formInvoiceId}
            onChange={(v) => {
              setFormInvoiceId(v)
              const inv = outstandingInvoices.find((x) => x.id === v)
              if (inv) setAmount(Number(inv.amount_due))
              setCreatedPaymentId(null)
            }}
            options={outstandingInvoiceOptions}
            placeholder="Factures impayées"
            disabled={schoolYearId <= 0 || formStudentId === null}
            isLoading={invoicesForPayment.isLoading}
            isError={invoicesForPayment.isError}
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">3) Montant</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-xs text-slate-500">4) Méthode</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="cash">Espèces</option>
            <option value="card">Carte</option>
            <option value="transfer">Virement</option>
            <option value="check">Chèque</option>
          </select>
        </label>
        {selectedOutstandingInvoice && (
          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 md:col-span-4">
            <p>
              Facture: <strong>{selectedOutstandingInvoice.invoice_number ?? 'Sans numéro'}</strong>
            </p>
            <p>
              Total {selectedOutstandingInvoice.total_amount} · Déjà payé {selectedOutstandingInvoice.amount_paid} ·
              Reste <strong>{selectedOutstandingInvoice.amount_due}</strong> · Statut {selectedOutstandingInvoice.status}
            </p>
          </div>
        )}
        <div className="flex items-end md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={create.isPending || !formStudentId || !formInvoiceId || amount <= 0}
          >
            5) Enregistrer et générer le reçu
          </button>
        </div>
        {createdPaymentId ? (
          <div className="md:col-span-6">
            <button
              type="button"
              onClick={() => financeApi.downloadReceipt(createdPaymentId)}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
            >
              6) Télécharger le reçu du dernier paiement
            </button>
          </div>
        ) : null}
      </form>

      {isLoading && <LoadingState label="Chargement des paiements…" lines={4} />}
      {isError && (
        <ErrorState
          error={qerr}
          fallback="Impossible de charger les paiements."
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Facture</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Reçu</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{p.payment_reference ?? 'Sans référence'}</td>
                  <td className="px-4 py-3">{p.payment_date}</td>
                  <td className="px-4 py-3">{p.amount}</td>
                  <td className="px-4 py-3">{p.student_name ?? 'Élève non identifié'}</td>
                  <td className="px-4 py-3">
                    {p.invoice_id
                      ? p.invoice_number ?? 'Facture sans numéro'
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => financeApi.downloadReceipt(p.id)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                    >
                      Télécharger
                    </button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-slate-500">
                    <EmptyState
                      emoji="💳"
                      title="Aucun paiement trouvé"
                      hint="Aucun paiement ne correspond à ce filtre."
                      action={
                        <button
                          type="button"
                          onClick={() => void refetch()}
                          className="school-btn-secondary"
                        >
                          Réessayer
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

