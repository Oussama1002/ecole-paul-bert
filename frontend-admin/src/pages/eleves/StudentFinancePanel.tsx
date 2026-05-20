import { useMutation, useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as financeApi from '../../api/finance'
import { getApiErrorMessage } from '../../utils/apiError'
import {
  FEE_ASSIGNMENT_STATUS_LABELS,
  FEE_ASSIGNMENT_STATUS_PILL,
  FEE_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
  formatMad,
} from '../../utils/studentFinanceLabels'

type FinanceView = 'fees' | 'payments'

const PAYMENT_METHODS = [
  ['cash', 'Espèces'],
  ['cheque', 'Chèque'],
  ['virement', 'Virement bancaire'],
  ['carte', 'Carte bancaire'],
  ['mobile', 'Paiement mobile'],
] as const

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
  const [view, setView] = useState<FinanceView | null>(null)

  const [newFeeTypeId, setNewFeeTypeId] = useState(0)
  const [newFeeAmount, setNewFeeAmount] = useState('')
  const [newFeeDueDate, setNewFeeDueDate] = useState('')
  const [newFeeErr, setNewFeeErr] = useState<string | null>(null)

  const [newPayFeeId, setNewPayFeeId] = useState(0)
  const [newPayAmount, setNewPayAmount] = useState('')
  const [newPayDate, setNewPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [newPayMethod, setNewPayMethod] = useState('cash')
  const [newPayNote, setNewPayNote] = useState('')
  const [newPayErr, setNewPayErr] = useState<string | null>(null)

  const { data: feeAssignments, refetch: refetchFees } = useQuery({
    queryKey: ['fee-assignments-student', studentId],
    queryFn: () => financeApi.fetchFeeAssignments({ student_id: studentId, per_page: 50 }),
    enabled: view === 'fees' || view === 'payments',
  })

  const { data: paymentsData, refetch: refetchPayments } = useQuery({
    queryKey: ['payments-student', studentId],
    queryFn: () => financeApi.fetchPayments({ student_id: studentId, per_page: 50 }),
    enabled: view === 'payments',
  })

  const { data: feeTypes } = useQuery({
    queryKey: ['fee-types-active'],
    queryFn: () => financeApi.fetchFeeTypes({ is_active: true, per_page: 100 }),
    enabled: view === 'fees' && canManage,
  })

  const totals = useMemo(() => {
    const items = feeAssignments?.items ?? []
    let balance = 0
    for (const f of items) {
      if (f.status === 'cancelled') continue
      balance += parseFloat(f.balance) || 0
    }
    return balance
  }, [feeAssignments?.items])

  const payableFees = useMemo(
    () =>
      (feeAssignments?.items ?? []).filter(
        (f) => f.status !== 'cancelled' && (parseFloat(f.balance) || 0) > 0.001
      ),
    [feeAssignments?.items]
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
    mutationFn: () =>
      financeApi.createPayment({
        student_id: studentId,
        school_year_id: schoolYearId ?? 0,
        fee_assignment_id: newPayFeeId,
        payment_date: newPayDate,
        amount: parseFloat(newPayAmount),
        payment_method: newPayMethod,
        note: newPayNote || null,
      }),
    onSuccess: () => {
      void refetchPayments()
      void refetchFees()
      setNewPayAmount('')
      setNewPayNote('')
      setNewPayFeeId(0)
      setNewPayErr(null)
    },
    onError: (e) => setNewPayErr(getApiErrorMessage(e, "Impossible d'enregistrer le paiement.")),
  })

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

  const btnBase =
    'flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-colors'
  const btnActive = 'border-school-grape bg-school-grape text-white shadow-school'
  const btnIdle =
    'border-school-line bg-white text-school-ink hover:border-school-grape/40 hover:bg-school-grape/5'

  return (
    <div className="space-y-4">
      {totals > 0 && (
        <p className="text-sm text-school-inkmuted">
          Reste à payer :{' '}
          <span className="font-bold tabular-nums text-[#B23A2E]">{formatMad(totals)}</span>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setView('fees')}
          className={`${btnBase} ${view === 'fees' ? btnActive : btnIdle}`}
        >
          💼 Frais scolaires
        </button>
        <button
          type="button"
          onClick={() => setView('payments')}
          className={`${btnBase} ${view === 'payments' ? btnActive : btnIdle}`}
        >
          💰 Paiements
        </button>
      </div>

      {view === null && (
        <p className="text-center text-sm text-school-inkmuted py-6">
          Choisissez Frais scolaires ou Paiements.
        </p>
      )}

      {view === 'fees' && (
        <section className="school-section space-y-4">
          {feeAssignments?.items.length ? (
            <ul className="space-y-2">
              {feeAssignments.items.map((f) => {
                const name = f.fee_type?.name ?? `Frais #${f.id}`
                const freq = f.fee_type?.frequency
                  ? FEE_FREQUENCY_LABELS[f.fee_type.frequency] ?? f.fee_type.frequency
                  : null
                return (
                  <li
                    key={f.id}
                    className="rounded-2xl border-2 border-school-line bg-white px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-school-ink">{name}</p>
                        {freq && <p className="text-xs text-school-inkmuted">{freq}</p>}
                        {f.due_date && (
                          <p className="text-xs text-school-inkmuted">
                            Échéance : {formatDate(f.due_date)}
                          </p>
                        )}
                      </div>
                      <span
                        className={
                          FEE_ASSIGNMENT_STATUS_PILL[f.status] ?? 'school-pill-muted'
                        }
                      >
                        {FEE_ASSIGNMENT_STATUS_LABELS[f.status] ?? f.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-school-inkmuted">Montant</span>
                        <p className="font-bold tabular-nums">{formatMad(f.amount_due)}</p>
                      </div>
                      <div>
                        <span className="text-school-inkmuted">Payé</span>
                        <p className="font-bold tabular-nums text-school-leafdeep">
                          {formatMad(f.amount_paid)}
                        </p>
                      </div>
                      <div>
                        <span className="text-school-inkmuted">Reste</span>
                        <p className="font-bold tabular-nums text-[#B23A2E]">
                          {formatMad(f.balance)}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-school-inkmuted">Aucun frais pour cet élève.</p>
          )}

          {canManage ? (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setNewFeeErr(null)
                if (!newFeeTypeId || !newFeeAmount) {
                  setNewFeeErr('Choisissez un type de frais et un montant.')
                  return
                }
                addFeeAssignment.mutate()
              }}
              className="space-y-3 border-t-2 border-school-line pt-4"
            >
              {newFeeErr && <p className="text-xs text-red-600">{newFeeErr}</p>}
              <Field label="Type (inscription, mensuel, transport…)">
                <select
                  required
                  value={newFeeTypeId || ''}
                  onChange={(e) => onFeeTypeChange(Number(e.target.value))}
                  className="school-select"
                >
                  <option value="">— Choisir —</option>
                  {feeTypes?.items.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} — {formatMad(ft.default_amount)} (
                      {FEE_FREQUENCY_LABELS[ft.frequency] ?? ft.frequency})
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
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
                <Field label="Date limite (optionnel)">
                  <input
                    type="date"
                    value={newFeeDueDate}
                    onChange={(e) => setNewFeeDueDate(e.target.value)}
                    className="school-input"
                  />
                </Field>
              </div>
              <button
                type="submit"
                disabled={addFeeAssignment.isPending}
                className="school-btn-primary w-full sm:w-auto disabled:opacity-60"
              >
                {addFeeAssignment.isPending ? 'Enregistrement…' : 'Enregistrer le frais'}
              </button>
              <p className="text-xs text-school-inkmuted">
                Types de frais :{' '}
                <Link to="/finance/types-de-frais" className="font-semibold text-school-grape underline">
                  Paramétrage
                </Link>
              </p>
            </form>
          ) : null}
        </section>
      )}

      {view === 'payments' && (
        <section className="school-section space-y-4">
          {paymentsData?.items.filter((p) => p.status !== 'cancelled').length ? (
            <ul className="space-y-2 text-sm">
              {paymentsData.items
                .filter((p) => p.status !== 'cancelled')
                .map((p) => (
                  <li
                    key={p.id}
                    className="rounded-2xl border-2 border-school-line bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-school-ink">
                        {p.fee_type_name ?? 'Paiement'}
                      </span>
                      <span className="font-bold tabular-nums text-school-leafdeep">
                        +{formatMad(p.amount)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-school-inkmuted">
                      <span>{formatDate(p.payment_date)}</span>
                      <span className="school-chip">
                        {PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
                      </span>
                      {p.note && <span className="italic">{p.note}</span>}
                    </div>
                    {p.has_receipt && (
                      <button
                        type="button"
                        onClick={() => financeApi.downloadReceipt(p.id)}
                        className="mt-2 text-xs font-bold text-school-grape hover:underline"
                      >
                        Télécharger le reçu
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-school-inkmuted">Aucun paiement enregistré.</p>
          )}

          {canManage ? (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setNewPayErr(null)
                if (!newPayFeeId) {
                  setNewPayErr('Indiquez pour quel frais ce paiement est effectué.')
                  return
                }
                if (!newPayAmount) {
                  setNewPayErr('Indiquez le montant.')
                  return
                }
                addPayment.mutate()
              }}
              className="space-y-3 border-t-2 border-school-line pt-4"
            >
              {newPayErr && <p className="text-xs text-red-600">{newPayErr}</p>}
              {payableFees.length === 0 ? (
                <p className="text-sm text-school-inkmuted">
                  Ajoutez d&apos;abord un frais scolaire (bouton Frais scolaires).
                </p>
              ) : (
                <>
                  <Field label="Pour quel frais ?">
                    <select
                      required
                      value={newPayFeeId || ''}
                      onChange={(e) => onPayFeeChange(Number(e.target.value))}
                      className="school-select"
                    >
                      <option value="">— Choisir —</option>
                      {payableFees.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.fee_type?.name ?? `Frais #${f.id}`} — reste{' '}
                          {formatMad(f.balance)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                      onChange={(e) => setNewPayMethod(e.target.value)}
                      className="school-select"
                    >
                      {PAYMENT_METHODS.map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
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
                    className="school-btn-primary w-full sm:w-auto disabled:opacity-60"
                  >
                    {addPayment.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
                  </button>
                </>
              )}
            </form>
          ) : null}
        </section>
      )}
    </div>
  )
}
