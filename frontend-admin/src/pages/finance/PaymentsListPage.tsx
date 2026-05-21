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

const METHOD_FR: Record<string, string> = {
  cash: 'Espèces',
  card: 'Carte',
  transfer: 'Virement',
  check: 'Chèque',
}

const STATUS_FR: Record<string, string> = {
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  pending: 'En attente',
}

type EditForm = {
  payment_date: string
  amount: number
  payment_method: string
  transaction_reference: string
  note: string
}

export function PaymentsListPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('finance.manage')
  const qc = useQueryClient()

  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [invoiceId, setInvoiceId] = useState<number | null>(null)

  // New payment modal
  const [showModal, setShowModal] = useState(false)
  const [formStudentId, setFormStudentId] = useState<number | null>(null)
  const [formFeeAssignmentId, setFormFeeAssignmentId] = useState<number | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState<string>('cash')
  const [chequeNumber, setChequeNumber] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [createdPaymentId, setCreatedPaymentId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Edit payment modal
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-payments'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({ per_page: 100, sort_by: 'start_date', sort_order: 'desc' }),
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
        per_page: 100,
      }),
    enabled: schoolYearId > 0 && studentId !== null,
  })

  const invoiceFilterOptions = useMemo<SearchSelectOption[]>(
    () =>
      (allInvoicesForFilter.data?.items ?? []).map((inv) => ({
        value: inv.id,
        label: inv.invoice_number ?? 'Facture sans numéro',
        hint: `Reste ${inv.amount_due}`,
      })),
    [allInvoicesForFilter.data?.items]
  )

  const feesForPayment = useQuery({
    queryKey: ['payments-fees-form', schoolYearId, formStudentId],
    queryFn: () =>
      financeApi.fetchFeeAssignments({
        school_year_id: schoolYearId || undefined,
        student_id: formStudentId ?? undefined,
        per_page: 100,
      }),
    enabled: schoolYearId > 0 && formStudentId !== null,
  })

  const payableFees = useMemo(
    () =>
      (feesForPayment.data?.items ?? []).filter(
        (fa) => fa.status !== 'cancelled' && (parseFloat(fa.balance) || 0) > 0.001
      ),
    [feesForPayment.data?.items]
  )

  const selectedFee = useMemo(
    () => payableFees.find((x) => x.id === formFeeAssignmentId) ?? null,
    [payableFees, formFeeAssignmentId]
  )

  function formatDue(d?: string | null): string {
    if (!d) return '—'
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const closeNewModal = () => {
    setShowModal(false)
    setFormStudentId(null)
    setFormFeeAssignmentId(null)
    setAmount(0)
    setMethod('cash')
    setChequeNumber('')
    setProofFile(null)
    setDate(new Date().toISOString().slice(0, 10))
    setCreatedPaymentId(null)
    setError(null)
  }

  const create = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!schoolYearId || !formStudentId || !formFeeAssignmentId || !amount) {
        throw new Error('Sélectionnez un élève, un frais et un montant.')
      }
      if (method === 'check' && !chequeNumber.trim()) {
        throw new Error('Indiquez le numéro de chèque.')
      }
      if ((method === 'check' || method === 'transfer') && !proofFile) {
        throw new Error(
          method === 'check'
            ? 'Joignez une image du chèque.'
            : 'Joignez le reçu de virement.'
        )
      }
      return financeApi.createPayment(
        {
          school_year_id: schoolYearId,
          student_id: formStudentId,
          fee_assignment_id: formFeeAssignmentId,
          payment_date: date,
          amount,
          payment_method: method,
          transaction_reference: method === 'check' ? chequeNumber.trim() : null,
        },
        proofFile
      )
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['fee-assignments'] })
      setCreatedPaymentId(created.id)
      setAmount(0)
      setFormFeeAssignmentId(null)
      setChequeNumber('')
      setProofFile(null)
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Création du paiement impossible.')),
  })

  const updatePayment = useMutation({
    mutationFn: async () => {
      if (!editingId || !editForm) return
      setEditError(null)
      await financeApi.updatePayment(editingId, {
        payment_date: editForm.payment_date || null,
        payment_method: editForm.payment_method,
        amount: editForm.amount > 0 ? editForm.amount : undefined,
        transaction_reference: editForm.transaction_reference || null,
        note: editForm.note || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setEditingId(null)
      setEditForm(null)
    },
    onError: (e) => setEditError(getApiErrorMessage(e, 'Modification impossible.')),
  })

  const openEdit = (p: financeApi.Payment) => {
    setEditingId(p.id)
    setEditError(null)
    setEditForm({
      payment_date: p.payment_date ?? '',
      amount: parseFloat(p.amount) || 0,
      payment_method: p.payment_method ?? 'cash',
      transaction_reference: (p as financeApi.Payment & { transaction_reference?: string }).transaction_reference ?? '',
      note: (p as financeApi.Payment & { note?: string }).note ?? '',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Paiements</h2>
          <p className="text-sm text-slate-500">
            Élève → frais à régler (échéance) → montant → facture et reçu générés automatiquement.
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowModal(true)} className="school-btn-primary">
            + Nouveau paiement
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Année scolaire</span>
          <select
            value={schoolYearId || ''}
            onChange={(e) => setSchoolYearId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">—</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Filtre élève</span>
          <SearchSelect
            value={studentId}
            onChange={(v) => { setStudentId(v); setInvoiceId(null) }}
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

      {/* New payment modal */}
      {showModal && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeNewModal() }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
              <h3 className="font-display text-lg font-bold text-school-ink">Nouveau paiement</h3>
              <button type="button" onClick={closeNewModal} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
            </div>
            <form
              className="space-y-4 p-6"
              onSubmit={(e) => { e.preventDefault(); create.mutate() }}
            >
              {error && (
                <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="1) Élève *" className="sm:col-span-2">
                  <SearchSelect
                    value={formStudentId}
                    onChange={(v) => {
                      setFormStudentId(v)
                      setFormFeeAssignmentId(null)
                      setAmount(0)
                      setCreatedPaymentId(null)
                    }}
                    options={studentOptions}
                    placeholder="Rechercher un élève"
                    disabled={schoolYearId <= 0}
                    isLoading={studentsQuery.isLoading}
                    isError={studentsQuery.isError}
                    className="mt-1"
                  />
                </Field>

                {formStudentId !== null && (
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                      2) Frais à régler *
                    </p>
                    {feesForPayment.isLoading && (
                      <p className="text-sm text-school-inkmuted">Chargement des frais…</p>
                    )}
                    {!feesForPayment.isLoading && payableFees.length === 0 && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Aucun frais impayé pour cet élève. Assignez des frais depuis sa fiche (onglet Finance).
                      </p>
                    )}
                    {payableFees.length > 0 && (
                      <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-school-line bg-school-cream/40 p-2">
                        {payableFees.map((fa) => {
                          const selected = formFeeAssignmentId === fa.id
                          const echeance = fa.next_due_date ?? fa.due_date
                          return (
                            <li key={fa.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormFeeAssignmentId(fa.id)
                                  setAmount(parseFloat(fa.balance) || 0)
                                  setCreatedPaymentId(null)
                                }}
                                className={`w-full rounded-xl border-2 px-3 py-2 text-left text-sm transition ${
                                  selected
                                    ? 'border-school-grape bg-white shadow-sm'
                                    : 'border-transparent bg-white/80 hover:border-school-line'
                                }`}
                              >
                                <span className="font-semibold text-school-ink">
                                  {fa.fee_type?.name ?? `Frais #${fa.id}`}
                                </span>
                                <span className="mt-0.5 block text-xs text-school-inkmuted">
                                  Reste {fa.balance} MAD
                                  {echeance ? ` · Échéance ${formatDue(echeance)}` : ''}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {selectedFee && (
                  <div className="rounded-xl border border-school-line bg-school-cream/60 p-3 text-xs text-school-inkmuted sm:col-span-2">
                    <p>
                      <strong className="text-school-ink">{selectedFee.fee_type?.name}</strong> — reste{' '}
                      <strong className="text-school-ink">{selectedFee.balance} MAD</strong>
                    </p>
                    <p>
                      Prochaine échéance&nbsp;:{' '}
                      <strong className="text-school-ink">
                        {formatDue(selectedFee.next_due_date ?? selectedFee.due_date)}
                      </strong>
                    </p>
                    <p className="mt-1 text-school-grape">Une facture sera créée automatiquement à l&apos;enregistrement.</p>
                  </div>
                )}

                <Field label="3) Montant (DH) *">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="school-input"
                  />
                </Field>
                <Field label="Date *">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="school-input"
                  />
                </Field>
                <Field label="4) Méthode de paiement" className="sm:col-span-2">
                  <select
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value)
                      setProofFile(null)
                      if (e.target.value !== 'check') setChequeNumber('')
                    }}
                    className="school-select"
                  >
                    <option value="cash">Espèces</option>
                    <option value="card">Carte</option>
                    <option value="transfer">Virement</option>
                    <option value="check">Chèque</option>
                  </select>
                </Field>

                {method === 'check' && (
                  <>
                    <Field label="N° de chèque *" className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="school-input"
                        placeholder="Ex. 1234567"
                      />
                    </Field>
                    <Field label="Photo / scan du chèque *" className="sm:col-span-2">
                      <input
                        type="file"
                        required
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                        className="school-input text-sm"
                      />
                    </Field>
                  </>
                )}

                {method === 'transfer' && (
                  <Field label="Reçu de virement *" className="sm:col-span-2">
                    <input
                      type="file"
                      required
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      className="school-input text-sm"
                    />
                  </Field>
                )}
              </div>

              {createdPaymentId && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-emerald-700">
                    Paiement enregistré — facture et reçu générés automatiquement.
                  </p>
                  <button
                    type="button"
                    onClick={() => financeApi.downloadReceipt(createdPaymentId)}
                    className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Télécharger le reçu
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeNewModal} className="school-btn-secondary">Fermer</button>
                <button
                  type="submit"
                  disabled={create.isPending || !formStudentId || !formFeeAssignmentId || amount <= 0}
                  className="school-btn-primary disabled:opacity-60"
                >
                  {create.isPending ? 'Enregistrement…' : 'Enregistrer et générer le reçu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit payment modal */}
      {editingId && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingId(null); setEditForm(null) } }}
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
              <h3 className="font-display text-lg font-bold text-school-ink">Modifier le paiement</h3>
              <button type="button" onClick={() => { setEditingId(null); setEditForm(null) }} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
            </div>
            <form
              className="space-y-4 p-6"
              onSubmit={(e) => { e.preventDefault(); updatePayment.mutate() }}
            >
              {editError && (
                <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{editError}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date *">
                  <input type="date" required value={editForm.payment_date} onChange={(e) => setEditForm((f) => f ? { ...f, payment_date: e.target.value } : f)} className="school-input" />
                </Field>
                <Field label="Montant (DH) *">
                  <input type="number" step="0.01" min="0.01" required value={editForm.amount || ''} onChange={(e) => setEditForm((f) => f ? { ...f, amount: Number(e.target.value) } : f)} className="school-input" />
                </Field>
                <Field label="Méthode de paiement" className="sm:col-span-2">
                  <select value={editForm.payment_method} onChange={(e) => setEditForm((f) => f ? { ...f, payment_method: e.target.value } : f)} className="school-select">
                    <option value="cash">Espèces</option>
                    <option value="card">Carte</option>
                    <option value="transfer">Virement</option>
                    <option value="check">Chèque</option>
                  </select>
                </Field>
                <Field label="Référence transaction" className="sm:col-span-2">
                  <input type="text" placeholder="Ex. CHQ-00123" value={editForm.transaction_reference} onChange={(e) => setEditForm((f) => f ? { ...f, transaction_reference: e.target.value } : f)} className="school-input" />
                </Field>
                <Field label="Note" className="sm:col-span-2">
                  <textarea rows={2} value={editForm.note} onChange={(e) => setEditForm((f) => f ? { ...f, note: e.target.value } : f)} maxLength={2000} className="school-input" />
                </Field>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setEditingId(null); setEditForm(null) }} className="school-btn-secondary">Annuler</button>
                <button type="submit" disabled={updatePayment.isPending} className="school-btn-primary disabled:opacity-60">
                  {updatePayment.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && <LoadingState label="Chargement des paiements…" lines={4} />}
      {isError && (
        <ErrorState error={qerr} fallback="Impossible de charger les paiements." onRetry={() => void refetch()} />
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Facture</th>
                <th className="px-4 py-3">Méthode</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{p.payment_reference ?? 'Sans référence'}</td>
                  <td className="px-4 py-3">{p.payment_date}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.amount}</td>
                  <td className="px-4 py-3">{p.student_name ?? 'Élève non identifié'}</td>
                  <td className="px-4 py-3">{p.invoice_id ? (p.invoice_number ?? 'Facture sans numéro') : '—'}</td>
                  <td className="px-4 py-3">{METHOD_FR[p.payment_method] ?? p.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      p.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      p.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {STATUS_FR[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => financeApi.downloadReceipt(p.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Reçu
                      </button>
                      {canManage && p.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded border border-school-grape/40 px-2 py-1 text-xs text-school-grape hover:bg-school-grape/5"
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-3 text-slate-500">
                    <EmptyState
                      emoji="💳"
                      title="Aucun paiement trouvé"
                      hint="Aucun paiement ne correspond à ce filtre."
                      action={
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
                            Réessayer
                          </button>
                          {canManage && (
                            <button type="button" onClick={() => setShowModal(true)} className="school-btn-primary">
                              + Nouveau paiement
                            </button>
                          )}
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
    </div>
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
