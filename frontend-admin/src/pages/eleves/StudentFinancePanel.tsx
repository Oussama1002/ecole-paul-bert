import { useMutation, useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as financeApi from '../../api/finance'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatMad, PAYMENT_METHOD_LABELS } from '../../utils/studentFinanceLabels'

const PAYMENT_METHODS = [
  ['cash', 'Espèces'],
  ['check', 'Chèque'],
  ['transfer', 'Virement bancaire'],
  ['card', 'Carte bancaire'],
] as const

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  pending: 'En attente',
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
        {label}
      </span>
      {children}
    </label>
  )
}

function FinanceModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b-2 border-school-line bg-school-bg px-5 py-4">
          <h2 className="font-display text-lg font-bold text-school-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-school-line px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
          >
            ✕ Fermer
          </button>
        </div>
        <div className="max-h-[min(70vh,640px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function StudentFinancePanel({
  studentId,
  schoolYearId,
  canManage,
  hasEnrollment,
}: {
  studentId: number
  schoolYearId: number | undefined
  canManage: boolean
  hasEnrollment: boolean
}) {
  const navigate = useNavigate()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const [newFeeTypeId, setNewFeeTypeId] = useState(0)
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [newFeeDueDate, setNewFeeDueDate] = useState('')
  const [newFeeErr, setNewFeeErr] = useState<string | null>(null)

  const [newPayFeeId, setNewPayFeeId] = useState(0)
  const [newPayAmount, setNewPayAmount] = useState('')
  const [newPayDate, setNewPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [newPayMethod, setNewPayMethod] = useState('cash')
  const [newPayChequeNumber, setNewPayChequeNumber] = useState('')
  const [newPayProofFile, setNewPayProofFile] = useState<File | null>(null)
  const [newPayNote, setNewPayNote] = useState('')
  const [newPayErr, setNewPayErr] = useState<string | null>(null)

  const { data: feeAssignments, refetch: refetchFees } = useQuery({
    queryKey: ['fee-assignments-student', studentId],
    queryFn: () => financeApi.fetchFeeAssignments({ student_id: studentId, per_page: 50 }),
  })

  const {
    data: paymentsData,
    isLoading: loadingPayments,
    isError: paymentsError,
    error: paymentsErr,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['payments-student', studentId],
    queryFn: () => financeApi.fetchAllPaymentsForStudent(studentId),
  })

  const { data: feeTypes } = useQuery({
    queryKey: ['fee-types-active'],
    queryFn: () => financeApi.fetchFeeTypes({ is_active: true, per_page: 100 }),
    enabled: canManage && paymentModalOpen,
  })

  const payableFees = useMemo(
    () =>
      (feeAssignments?.items ?? []).filter(
        (f) => f.status !== 'cancelled' && (parseFloat(f.balance) || 0) > 0.001
      ),
    [feeAssignments?.items]
  )

  const paymentItems = paymentsData ?? []

  const confirmedPayments = useMemo(
    () => paymentItems.filter((p) => p.status !== 'cancelled'),
    [paymentItems]
  )

  const paymentHistory = useMemo(
    () =>
      [...paymentItems].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      ),
    [paymentItems]
  )

  const totalPaid = useMemo(
    () =>
      confirmedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [confirmedPayments]
  )

  const addFeeAssignment = useMutation({
    mutationFn: () =>
      financeApi.createFeeAssignment({
        student_id: studentId,
        school_year_id: schoolYearId ?? 0,
        fee_type_id: newFeeTypeId,
        amount_due: parseFloat(newFeeAmount),
        due_date: newFeeDueDate || null,
      }),
    onSuccess: () => {
      void refetchFees()
      setNewFeeAmount('')
      setNewFeeDueDate('')
      setNewFeeTypeId(0)
      setNewFeeErr(null)
    },
    onError: (e) => setNewFeeErr(getApiErrorMessage(e, "Impossible d'assigner les frais.")),
  })

  const addPayment = useMutation({
    mutationFn: () => {
      if (newPayMethod === 'check' && !newPayChequeNumber.trim()) {
        throw new Error('Indiquez le numéro de chèque.')
      }
      if ((newPayMethod === 'check' || newPayMethod === 'transfer') && !newPayProofFile) {
        throw new Error(
          newPayMethod === 'check'
            ? 'Joignez une image du chèque.'
            : 'Joignez le reçu de virement.'
        )
      }
      return financeApi.createPayment(
        {
          student_id: studentId,
          school_year_id: schoolYearId ?? 0,
          fee_assignment_id: newPayFeeId,
          payment_date: newPayDate,
          amount: parseFloat(newPayAmount),
          payment_method: newPayMethod,
          transaction_reference: newPayMethod === 'check' ? newPayChequeNumber.trim() : null,
          note: newPayNote || null,
        },
        newPayProofFile
      )
    },
    onSuccess: () => {
      void refetchPayments()
      void refetchFees()
      setNewPayAmount('')
      setNewPayNote('')
      setNewPayFeeId(0)
      setNewPayChequeNumber('')
      setNewPayProofFile(null)
      setNewPayErr(null)
      setPaymentModalOpen(false)
    },
    onError: (e) => setNewPayErr(getApiErrorMessage(e, "Impossible d'enregistrer le paiement.")),
  })

  function openPaymentModal() {
    setNewPayErr(null)
    setPaymentModalOpen(true)
  }

  function goToFeeTypesSetup() {
    navigate('/finance/types-de-frais')
  }

  function onFeeTypeChange(typeId: number) {
    setNewFeeTypeId(typeId)
    const ft = feeTypes?.items.find((t) => t.id === typeId)
    if (ft?.default_amount) setNewFeeAmount(ft.default_amount)
  }

  function onPayFeeChange(feeId: number) {
    setNewPayFeeId(feeId)
    const fa = payableFees.find((f) => f.id === feeId)
    if (fa?.balance) setNewPayAmount(fa.balance)
  }

  if (!hasEnrollment) {
    return (
      <p className="rounded-2xl border-2 border-school-line bg-school-cream px-4 py-3 text-sm text-school-inkmuted">
        Inscrivez l&apos;élève pour une année scolaire avant de gérer les frais et paiements.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={openPaymentModal}
          disabled={!canManage}
          className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-school-leaf/40 bg-school-leaf/10 px-6 py-5 font-display text-base font-bold text-school-leafdeep shadow-school transition hover:bg-school-leaf/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-2xl">💰</span>
          Enregistrer un paiement
        </button>
        <button
          type="button"
          onClick={goToFeeTypesSetup}
          disabled={!canManage}
          className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-school-sunsoft bg-school-sunsoft/40 px-6 py-5 font-display text-base font-bold text-school-ink shadow-school transition hover:bg-school-sunsoft/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-2xl">⚙️</span>
          Configurer les types de frais
        </button>
      </div>

      <section className="school-section">
        <div className="school-section-title mb-4">
          <span className="school-section-title-icon bg-school-leaf/20">📜</span>
          Historique des paiements
          {paymentHistory.length > 0 && (
            <span className="school-chip ml-2">
              {paymentHistory.length} paiement{paymentHistory.length > 1 ? 's' : ''}
            </span>
          )}
          {totalPaid > 0 && (
            <span className="school-chip ml-1 text-school-leafdeep">
              Total {formatMad(totalPaid)}
            </span>
          )}
        </div>

        {loadingPayments && <LoadingState label="Chargement de l'historique…" lines={4} />}

        {paymentsError && (
          <ErrorState
            error={paymentsErr}
            fallback="Impossible de charger l'historique des paiements."
            onRetry={() => void refetchPayments()}
          />
        )}

        {!loadingPayments && !paymentsError && paymentHistory.length === 0 && (
          <EmptyState
            emoji="💳"
            title="Aucun paiement enregistré"
            hint="Les paiements de cet élève apparaîtront ici après enregistrement."
          />
        )}

        {!loadingPayments && !paymentsError && paymentHistory.length > 0 && (
          <div className="school-table-wrap">
            <table className="school-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type de frais</th>
                  <th className="text-right">Montant</th>
                  <th>Mode</th>
                  <th>Référence</th>
                  <th>Statut</th>
                  <th>Note</th>
                  <th className="text-right">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{formatDate(p.payment_date)}</td>
                    <td className="font-semibold">{p.fee_type_name ?? '—'}</td>
                    <td className="text-right font-bold tabular-nums text-school-leafdeep">
                      {formatMad(p.amount)}
                    </td>
                    <td>{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                    <td className="text-school-inkmuted">
                      {p.payment_reference ?? '—'}
                    </td>
                    <td>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === 'confirmed'
                            ? 'bg-school-leaf/15 text-school-leafdeep'
                            : p.status === 'cancelled'
                              ? 'bg-school-coral/15 text-[#B23A2E]'
                              : 'bg-school-sky/15 text-school-skydeep'
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="max-w-[12rem] truncate text-school-inkmuted" title={p.note ?? ''}>
                      {p.note || '—'}
                    </td>
                    <td className="text-right">
                      {p.has_receipt ? (
                        <button
                          type="button"
                          onClick={() => void financeApi.downloadReceipt(p.id)}
                          className="text-xs font-semibold text-school-grape hover:underline"
                        >
                          Télécharger
                        </button>
                      ) : (
                        <span className="text-school-inkmuted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {paymentModalOpen && (
        <FinanceModal
          title="Enregistrer un paiement"
          onClose={() => setPaymentModalOpen(false)}
        >
          {confirmedPayments.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-school-inkmuted">
                Paiements déjà enregistrés
              </p>
              <ul className="max-h-32 space-y-1.5 overflow-y-auto text-sm">
                {confirmedPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-2 rounded-lg border border-school-line bg-white px-3 py-2"
                  >
                    <span className="text-school-ink">
                      {p.fee_type_name ?? 'Paiement'} · {formatDate(p.payment_date)}
                    </span>
                    <span className="font-bold tabular-nums text-school-leafdeep">
                      {formatMad(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && payableFees.length === 0 && (
            <div className="mb-4 space-y-3 rounded-2xl border-2 border-school-sunsoft/50 bg-school-sunsoft/20 p-4">
              <p className="text-sm font-semibold text-school-ink">
                Aucun frais à régler pour cet élève. Définissez d&apos;abord ce qu&apos;il doit
                payer :
              </p>
              {newFeeErr && <p className="text-xs text-red-600">{newFeeErr}</p>}
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  setNewFeeErr(null)
                  if (!newFeeTypeId || !newFeeAmount) {
                    setNewFeeErr('Choisissez un type et un montant.')
                    return
                  }
                  addFeeAssignment.mutate()
                }}
                className="space-y-2"
              >
                <Field label="Type de frais">
                  <select
                    required
                    value={newFeeTypeId || ''}
                    onChange={(e) => onFeeTypeChange(Number(e.target.value))}
                    className="school-select text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {feeTypes?.items.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.name} — {formatMad(ft.default_amount)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Montant dû (MAD)">
                  <input
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(e.target.value)}
                    className="school-input"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={addFeeAssignment.isPending}
                  className="school-btn-secondary w-full text-sm"
                >
                  {addFeeAssignment.isPending ? 'Ajout…' : 'Ajouter ce frais à l\'élève'}
                </button>
              </form>
              <button
                type="button"
                onClick={goToFeeTypesSetup}
                className="w-full text-center text-xs font-semibold text-school-grape underline"
              >
                Ou créer de nouveaux types (inscription, transport…)
              </button>
            </div>
          )}

          {canManage && payableFees.length > 0 && (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setNewPayErr(null)
                if (!newPayFeeId) {
                  setNewPayErr('Choisissez le frais concerné.')
                  return
                }
                if (!newPayAmount) {
                  setNewPayErr('Indiquez le montant.')
                  return
                }
                addPayment.mutate()
              }}
              className="space-y-3"
            >
              {newPayErr && <p className="text-xs text-red-600">{newPayErr}</p>}
              <Field label="Pour quel frais ?">
                <select
                  required
                  value={newPayFeeId || ''}
                  onChange={(e) => onPayFeeChange(Number(e.target.value))}
                  className="school-select text-sm"
                >
                  <option value="">— Choisir —</option>
                  {payableFees.map((f) => {
                    const echeance = f.next_due_date ?? f.due_date
                    return (
                      <option key={f.id} value={f.id}>
                        {f.fee_type?.name ?? `Frais #${f.id}`} — reste {formatMad(f.balance)}
                        {echeance ? ` · éch. ${formatDate(echeance)}` : ''}
                      </option>
                    )
                  })}
                </select>
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Montant reçu (MAD)">
                  <input
                    required
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={newPayAmount}
                    onChange={(e) => setNewPayAmount(e.target.value)}
                    className="school-input"
                  />
                </Field>
                <Field label="Date">
                  <input
                    required
                    type="date"
                    value={newPayDate}
                    onChange={(e) => setNewPayDate(e.target.value)}
                    className="school-input"
                  />
                </Field>
              </div>
              <Field label="Mode de paiement">
                <select
                  value={newPayMethod}
                  onChange={(e) => {
                    setNewPayMethod(e.target.value)
                    setNewPayProofFile(null)
                    if (e.target.value !== 'check') setNewPayChequeNumber('')
                  }}
                  className="school-select"
                >
                  {PAYMENT_METHODS.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              {newPayMethod === 'check' && (
                <>
                  <Field label="N° de chèque *">
                    <input
                      required
                      value={newPayChequeNumber}
                      onChange={(e) => setNewPayChequeNumber(e.target.value)}
                      className="school-input"
                    />
                  </Field>
                  <Field label="Photo / scan du chèque *">
                    <input
                      type="file"
                      required
                      accept="image/*,.pdf"
                      onChange={(e) => setNewPayProofFile(e.target.files?.[0] ?? null)}
                      className="school-input text-sm"
                    />
                  </Field>
                </>
              )}
              {newPayMethod === 'transfer' && (
                <Field label="Reçu de virement *">
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf"
                    onChange={(e) => setNewPayProofFile(e.target.files?.[0] ?? null)}
                    className="school-input text-sm"
                  />
                </Field>
              )}
              <Field label="Note (optionnel)">
                <input
                  value={newPayNote}
                  onChange={(e) => setNewPayNote(e.target.value)}
                  className="school-input"
                  placeholder="Ex. Paiement janvier…"
                />
              </Field>
              <button
                type="submit"
                disabled={addPayment.isPending}
                className="school-btn-primary w-full text-sm disabled:opacity-60"
              >
                {addPayment.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
              </button>
            </form>
          )}
        </FinanceModal>
      )}
    </div>
  )
}
