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

const PAYMENT_METHODS = [
  ['cash', 'Espèces'],
  ['cheque', 'Chèque'],
  ['virement', 'Virement bancaire'],
  ['carte', 'Carte bancaire'],
  ['mobile', 'Paiement mobile'],
] as const

type ModalKind = 'fees' | 'payments' | null

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
  const [modal, setModal] = useState<ModalKind>(null)

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
  })

  const { data: paymentsData, refetch: refetchPayments } = useQuery({
    queryKey: ['payments-student', studentId],
    queryFn: () => financeApi.fetchPayments({ student_id: studentId, per_page: 50 }),
  })

  const { data: feeTypes } = useQuery({
    queryKey: ['fee-types-active'],
    queryFn: () => financeApi.fetchFeeTypes({ is_active: true, per_page: 100 }),
    enabled: canManage && modal === 'fees',
  })

  const totals = useMemo(() => {
    const items = feeAssignments?.items ?? []
    let due = 0
    let paid = 0
    let balance = 0
    for (const f of items) {
      if (f.status === 'cancelled') continue
      due += parseFloat(f.amount_due) || 0
      paid += parseFloat(f.amount_paid) || 0
      balance += parseFloat(f.balance) || 0
    }
    return { due, paid, balance }
  }, [feeAssignments?.items])

  const payableFees = useMemo(
    () =>
      (feeAssignments?.items ?? []).filter(
        (f) => f.status !== 'cancelled' && (parseFloat(f.balance) || 0) > 0.001
      ),
    [feeAssignments?.items]
  )

  const confirmedPayments = useMemo(
    () => (paymentsData?.items ?? []).filter((p) => p.status !== 'cancelled'),
    [paymentsData?.items]
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
      setModal(null)
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
      setModal(null)
    },
    onError: (e) => setNewPayErr(getApiErrorMessage(e, "Impossible d'enregistrer le paiement.")),
  })

  function openFeesModal() {
    setNewFeeErr(null)
    setModal('fees')
  }

  function openPaymentsModal() {
    setNewPayErr(null)
    setModal('payments')
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-school-line bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">À payer</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums text-school-ink">
            {formatMad(totals.due)}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-school-line bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">Déjà payé</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums text-school-leafdeep">
            {formatMad(totals.paid)}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-school-coral/30 bg-school-coral/5 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">Reste à payer</p>
          <p className="mt-1 font-display text-xl font-bold tabular-nums text-[#B23A2E]">
            {formatMad(totals.balance)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={openFeesModal}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-school-sunsoft bg-school-sunsoft/40 px-6 py-4 font-display text-base font-bold text-school-ink shadow-school transition hover:bg-school-sunsoft/60"
        >
          <span className="text-xl">💼</span>
          Frais scolaires
          {(feeAssignments?.items.length ?? 0) > 0 && (
            <span className="school-pill-sky text-xs">{feeAssignments?.items.length}</span>
          )}
        </button>
        <button
          type="button"
          onClick={openPaymentsModal}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-school-leaf/40 bg-school-leaf/10 px-6 py-4 font-display text-base font-bold text-school-leafdeep shadow-school transition hover:bg-school-leaf/20"
        >
          <span className="text-xl">💰</span>
          Paiements
          {confirmedPayments.length > 0 && (
            <span className="school-pill-green text-xs">{confirmedPayments.length}</span>
          )}
        </button>
      </div>

      {modal === 'fees' && (
        <FinanceModal title="Frais scolaires" onClose={() => setModal(null)}>
          {feeAssignments?.items.length ? (
            <ul className="mb-4 space-y-2 text-sm">
              {feeAssignments.items.map((f) => {
                const name = f.fee_type?.name ?? `Frais #${f.id}`
                return (
                  <li
                    key={f.id}
                    className="rounded-xl border-2 border-school-line bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-school-ink">{name}</span>
                      <span className={FEE_ASSIGNMENT_STATUS_PILL[f.status] ?? 'school-pill-muted'}>
                        {FEE_ASSIGNMENT_STATUS_LABELS[f.status] ?? f.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-school-inkmuted">
                      Dû {formatMad(f.amount_due)} · Payé {formatMad(f.amount_paid)} · Reste{' '}
                      <span className="font-bold text-[#B23A2E]">{formatMad(f.balance)}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-school-inkmuted">Aucun frais pour cet élève.</p>
          )}

          {canManage && (
            <>
              <p className="mb-2 text-xs text-school-inkmuted">
                Types configurés dans{' '}
                <Link to="/finance/types-de-frais" className="font-semibold text-school-grape underline">
                  Types de frais
                </Link>
              </p>
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
                    className="school-select text-sm"
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
                <div className="grid gap-2 sm:grid-cols-2">
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
                  className="school-btn-primary w-full text-sm disabled:opacity-60"
                >
                  {addFeeAssignment.isPending ? 'Enregistrement…' : 'Ajouter le frais'}
                </button>
              </form>
            </>
          )}
        </FinanceModal>
      )}

      {modal === 'payments' && (
        <FinanceModal title="Paiements" onClose={() => setModal(null)}>
          {confirmedPayments.length ? (
            <ul className="mb-4 space-y-2 text-sm">
              {confirmedPayments.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border-2 border-school-line bg-white px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-school-ink">
                      {p.fee_type_name ?? 'Paiement'}
                    </span>
                    <span className="font-bold tabular-nums text-school-leafdeep">
                      +{formatMad(p.amount)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-school-inkmuted">
                    <span>{formatDate(p.payment_date)}</span>
                    <span>{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</span>
                  </div>
                  {p.has_receipt && (
                    <button
                      type="button"
                      onClick={() => financeApi.downloadReceipt(p.id)}
                      className="mt-1 text-xs font-bold text-school-grape hover:underline"
                    >
                      Reçu PDF
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-school-inkmuted">Aucun paiement enregistré.</p>
          )}

          {canManage && (
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
                  Ajoutez d&apos;abord un frais scolaire ou tous les soldes sont réglés.
                </p>
              ) : (
                <>
                  <Field label="Pour quel frais ?">
                    <select
                      required
                      value={newPayFeeId || ''}
                      onChange={(e) => onPayFeeChange(Number(e.target.value))}
                      className="school-select text-sm"
                    >
                      <option value="">— Choisir —</option>
                      {payableFees.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.fee_type?.name ?? `Frais #${f.id}`} — reste {formatMad(f.balance)}
                        </option>
                      ))}
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
                    className="school-btn-primary w-full text-sm disabled:opacity-60"
                  >
                    {addPayment.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
                  </button>
                </>
              )}
            </form>
          )}
        </FinanceModal>
      )}
    </div>
  )
}
