import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as schoolYearsApi from '../../api/schoolYears'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../../contexts/AuthContext'
import { getApiErrorMessage } from '../../utils/apiError'

type CostType = 'fixed' | 'variable'
type StatusFilter = '' | 'active' | 'cancelled'

const EMPTY_FORM = {
  expense_category_id: 0,
  expense_date: new Date().toISOString().slice(0, 10),
  amount: '' as string | number,
  cost_type: 'variable' as CostType,
  vendor: '',
  reference: '',
  description: '',
}

export function ExpensesListPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('finance.manage')
  const qc = useQueryClient()

  // ── Filters ────────────────────────────────────────────────────────────────
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<number>(0)
  const [costType, setCostType] = useState<'' | CostType>('')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [refManual, setRefManual] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: years } = useQuery({
    queryKey: ['school-years-expenses'],
    queryFn: () => schoolYearsApi.fetchSchoolYears({ per_page: 100, sort_by: 'start_date', sort_order: 'desc' }),
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId > 0) return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => financeApi.fetchExpenseCategories({ is_active: true, per_page: 100 }),
  })

  const { data: nextRef, refetch: refetchRef } = useQuery({
    queryKey: ['expense-next-ref'],
    queryFn: financeApi.fetchNextExpenseReference,
    enabled: showModal && !editingId && !refManual,
    staleTime: 0,
  })

  useEffect(() => {
    if (nextRef && showModal && !editingId && !refManual) {
      setForm((f) => ({ ...f, reference: nextRef }))
    }
  }, [nextRef, showModal, editingId, refManual])

  const filtersKey = ['expenses', schoolYearId, categoryId, costType, status, from, to] as const
  const { data, isLoading, isError, error: qerr } = useQuery({
    queryKey: filtersKey,
    queryFn: () => financeApi.fetchExpenses({
      school_year_id: schoolYearId || undefined,
      expense_category_id: categoryId || undefined,
      cost_type: costType || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      per_page: 100,
    }),
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async () => {
      if (!form.expense_category_id || !form.amount || Number(form.amount) <= 0) {
        throw new Error('Catégorie et montant > 0 requis.')
      }
      const payload = {
        expense_category_id: form.expense_category_id,
        expense_date: form.expense_date,
        amount: Number(form.amount),
        cost_type: form.cost_type,
        school_year_id: schoolYearId || null,
        vendor: form.vendor || null,
        reference: form.reference || null,
        description: form.description || null,
      }
      if (editingId) {
        await financeApi.updateExpense(editingId, payload)
      } else {
        await financeApi.createExpense(payload)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      closeModal()
    },
    onError: (e) => setFormError(getApiErrorMessage(e, "Impossible d'enregistrer la dépense.")),
  })

  const cancel = useMutation({
    mutationFn: (vars: { id: number; reason: string }) => financeApi.cancelExpense(vars.id, vars.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().slice(0, 10) })
    setRefManual(false)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (e: financeApi.Expense) => {
    setEditingId(e.id)
    setForm({
      expense_category_id: e.expense_category_id,
      expense_date: e.expense_date,
      amount: Number(e.amount),
      cost_type: e.cost_type,
      vendor: e.vendor ?? '',
      reference: e.reference ?? '',
      description: e.description ?? '',
    })
    setRefManual(true)
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setRefManual(false)
    setFormError(null)
  }

  const formatDate = (d: string) => {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-school-ink">Dépenses</h2>
          <p className="text-sm text-school-inkmuted">Enregistrez et suivez les dépenses de l'école.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openNew} className="school-btn-primary">
            + Nouvelle dépense
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border-2 border-school-line bg-white p-4 md:grid-cols-6">
        <Field label="Année scolaire">
          <select value={schoolYearId || ''} onChange={(e) => setSchoolYearId(Number(e.target.value))} className="school-select">
            <option value="">—</option>
            {years?.items.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </Field>
        <Field label="Catégorie">
          <select value={categoryId || ''} onChange={(e) => setCategoryId(Number(e.target.value))} className="school-select">
            <option value="">Toutes</option>
            {categories?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Nature">
          <select value={costType} onChange={(e) => setCostType(e.target.value as '' | CostType)} className="school-select">
            <option value="">Toutes</option>
            <option value="fixed">Fixe</option>
            <option value="variable">Variable</option>
          </select>
        </Field>
        <Field label="Statut">
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="school-select">
            <option value="">Tous</option>
            <option value="active">Actives</option>
            <option value="cancelled">Annulées</option>
          </select>
        </Field>
        <Field label="Du">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="school-input" />
        </Field>
        <Field label="Au">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="school-input" />
        </Field>
      </div>

      {/* List */}
      {isLoading && <LoadingState label="Chargement des dépenses…" lines={4} />}
      {isError && <ErrorState error={qerr} fallback="Impossible de charger les dépenses." />}

      {data && (
        <div className="rounded-2xl border-2 border-school-line bg-white overflow-hidden">
          <table className="school-table min-w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Nature</th>
                <th>Montant</th>
                <th>Bénéficiaire</th>
                <th>Réf.</th>
                <th>Statut</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => {
                const cat = categories?.items.find((c) => c.id === e.expense_category_id)
                const isCancelled = e.status === 'cancelled'
                return (
                  <tr key={e.id} className={isCancelled ? 'opacity-40 line-through' : ''}>
                    <td className="text-school-inkmuted">{formatDate(e.expense_date)}</td>
                    <td className="font-semibold">{cat?.name ?? '—'}</td>
                    <td>
                      <span className={`school-pill-${e.cost_type === 'fixed' ? 'grape' : 'sun'}`}>
                        {e.cost_type === 'fixed' ? 'Fixe' : 'Variable'}
                      </span>
                    </td>
                    <td className="tabular-nums font-bold">{Number(e.amount).toLocaleString('fr-FR')} MAD</td>
                    <td>{e.vendor ?? '—'}</td>
                    <td className="font-mono text-xs">{e.reference ?? '—'}</td>
                    <td>
                      <span className={isCancelled ? 'school-pill-coral' : 'school-pill-green'}>
                        {isCancelled ? 'Annulée' : 'Active'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="space-x-2 text-right">
                        {!isCancelled && (
                          <>
                            <button type="button" onClick={() => openEdit(e)} className="text-xs font-bold text-school-skydeep hover:underline">
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt("Motif d'annulation (optionnel) :", '')
                                if (reason !== null) cancel.mutate({ id: e.id, reason })
                              }}
                              className="text-xs font-bold text-[#B23A2E] hover:underline"
                            >
                              Annuler
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 7}>
                    <EmptyState emoji="🧾" title="Aucune dépense" hint="Aucune dépense ne correspond aux filtres sélectionnés." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="w-full max-w-2xl rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-school-line px-6 py-4">
              <h3 className="font-display text-lg font-bold text-school-ink">
                {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h3>
              <button type="button" onClick={closeModal} className="text-school-inkmuted hover:text-school-ink text-xl leading-none">✕</button>
            </div>

            <form
              className="space-y-4 p-6"
              onSubmit={(e) => { e.preventDefault(); setFormError(null); save.mutate() }}
            >
              {formError && (
                <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
                  {formError}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Catégorie *" className="sm:col-span-2">
                  <select
                    required
                    value={form.expense_category_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, expense_category_id: Number(e.target.value) }))}
                    className="school-select"
                  >
                    <option value="">— Choisir —</option>
                    {categories?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>

                <Field label="Date *">
                  <input
                    required
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                    className="school-input"
                  />
                </Field>

                <Field label="Montant (MAD) *">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="school-input"
                    placeholder="1500.00"
                  />
                </Field>

                <Field label="Nature">
                  <select
                    value={form.cost_type}
                    onChange={(e) => setForm((f) => ({ ...f, cost_type: e.target.value as CostType }))}
                    className="school-select"
                  >
                    <option value="variable">Variable</option>
                    <option value="fixed">Fixe</option>
                  </select>
                </Field>

                <Field label="Référence (auto-générée)">
                  <div className="flex gap-2">
                    <input
                      value={form.reference}
                      onChange={(e) => { setRefManual(true); setForm((f) => ({ ...f, reference: e.target.value })) }}
                      className="school-input flex-1 font-mono"
                      placeholder="DEP-2026-0001"
                    />
                    {!editingId && (
                      <button
                        type="button"
                        title="Regénérer"
                        onClick={() => { setRefManual(false); void refetchRef() }}
                        className="shrink-0 rounded-xl border-2 border-school-line px-2 text-school-inkmuted hover:bg-school-cream"
                      >
                        ↻
                      </button>
                    )}
                  </div>
                </Field>

                <Field label="Bénéficiaire / Fournisseur">
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                    maxLength={150}
                    className="school-input"
                  />
                </Field>

                <Field label="Description" className="sm:col-span-2">
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    maxLength={5000}
                    className="school-input"
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="school-btn-secondary">Annuler</button>
                <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                  {save.isPending ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">{label}</span>
      {children}
    </label>
  )
}
