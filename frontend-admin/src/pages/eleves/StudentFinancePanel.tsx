import { useMutation, useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as financeApi from '../../api/finance'
import { SectionTitle } from '../../components/ui/SectionTitle'
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
    enabled: canManage,
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
    if (ft?.default_amount) {
      setNewFeeAmount(ft.default_amount)
    }
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
      {canManage && (
        <p className="text-sm text-school-inkmuted">
          Configurez d&apos;abord les types de frais (inscription, mensualité, transport…)
          dans{' '}
          <Link to="/finance/types-de-frais" className="font-semibold text-school-grape underline">
            Finance → Types de frais
          </Link>
          , puis assignez-les à l&apos;élève ci-dessous.
        </p>
      )}

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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="school-section space-y-3">
          <SectionTitle
            emoji="📋"
            title="Ce que l'élève doit payer"
            iconClassName="bg-school-sunsoft text-[#8A6A00]"
          />
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
                        {freq && (
                          <p className="text-xs text-school-inkmuted">{freq}</p>
                        )}
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
            <p className="text-sm text-school-inkmuted">
              Aucun frais configuré pour cet élève. Assignez inscription, mensualité, transport…
            </p>
          )}

          {canManage && (
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
              className="border-t-2 border-school-line pt-3 space-y-2"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">
                Ajouter un frais à payer
              </p>
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
                className="school-btn-primary text-sm disabled:opacity-60"
              >
                {addFeeAssignment.isPending ? 'Ajout…' : 'Ajouter à la fiche'}
              </button>
            </form>
          )}
        </section>

        <section className="school-section space-y-3">
          <SectionTitle
            emoji="💰"
            title="Paiements reçus"
            iconClassName="bg-school-leaf/15 text-school-leafdeep"
          />
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
            <p className="text-sm text-school-inkmuted">Aucun paiement enregistré pour cet élève.</p>
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
              className="border-t-2 border-school-line pt-3 space-y-2"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-school-inkmuted">
                Enregistrer un paiement
              </p>
              {newPayErr && <p className="text-xs text-red-600">{newPayErr}</p>}
              {payableFees.length === 0 ? (
                <p className="text-xs text-school-inkmuted">
                  Ajoutez d&apos;abord un frais « à payer » ou tous les soldes sont réglés.
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
                          {f.fee_type?.name ?? `Frais #${f.id}`} — reste{' '}
                          {formatMad(f.balance)}
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
                      placeholder="Ex. Paiement janvier, acompte…"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={addPayment.isPending}
                    className="school-btn-primary text-sm disabled:opacity-60"
                  >
                    {addPayment.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
                  </button>
                </>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
