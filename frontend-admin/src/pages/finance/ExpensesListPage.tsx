import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as schoolYearsApi from '../../api/schoolYears'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../../contexts/AuthContext'

type CostType = 'fixed' | 'variable'
type StatusFilter = '' | 'active' | 'cancelled'

export function ExpensesListPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('finance.manage')
  const qc = useQueryClient()

  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [categoryId, setCategoryId] = useState<number>(0)
  const [costType, setCostType] = useState<'' | CostType>('')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    expense_category_id: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    amount: 0,
    cost_type: 'variable' as CostType,
    vendor: '',
    reference: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: years } = useQuery({
    queryKey: ['school-years-expenses'],
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

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => financeApi.fetchExpenseCategories({ is_active: true, per_page: 100 }),
  })

  const filtersKey = [
    'expenses',
    schoolYearId,
    categoryId,
    costType,
    status,
    from,
    to,
  ] as const

  const { data, isLoading, isError, error: qerr } = useQuery({
    queryKey: filtersKey,
    queryFn: () =>
      financeApi.fetchExpenses({
        school_year_id: schoolYearId || undefined,
        expense_category_id: categoryId || undefined,
        cost_type: costType || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        per_page: 100,
      }),
  })

  const resetForm = () => {
    setEditingId(null)
    setForm({
      expense_category_id: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      cost_type: 'variable',
      vendor: '',
      reference: '',
      description: '',
    })
  }

  const save = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!form.expense_category_id || !form.amount || form.amount <= 0) {
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
      resetForm()
    },
    onError: (e: Error) => setError(e.message),
  })

  const cancel = useMutation({
    mutationFn: async (vars: { id: number; reason: string }) =>
      financeApi.cancelExpense(vars.id, vars.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const startEdit = (e: financeApi.Expense) => {
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
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Dépenses</h2>
          <p className="text-sm text-slate-500">
            Enregistrez et suivez les dépenses de l'école.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-6">
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
        <Field label="Catégorie">
          <select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Toutes</option>
            {categories?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nature">
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value as '' | CostType)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Toutes</option>
            <option value="fixed">Fixe</option>
            <option value="variable">Variable</option>
          </select>
        </Field>
        <Field label="Statut">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Tous</option>
            <option value="active">Actives</option>
            <option value="cancelled">Annulées</option>
          </select>
        </Field>
        <Field label="Du">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
        <Field label="Au">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </Field>
      </div>

      {canManage && (
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className="md:col-span-6 flex items-center justify-between">
            <h3 className="font-medium text-slate-800">
              {editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-slate-500 hover:underline"
              >
                Annuler la modification
              </button>
            )}
          </div>
          {error && <p className="md:col-span-6 text-sm text-red-600">{error}</p>}

          <Field label="Catégorie *" className="md:col-span-2">
            <select
              value={form.expense_category_id || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, expense_category_id: Number(e.target.value) }))
              }
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">— Choisir —</option>
              {categories?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date *">
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="Montant *">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount || ''}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="Nature">
            <select
              value={form.cost_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, cost_type: e.target.value as CostType }))
              }
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="variable">Variable</option>
              <option value="fixed">Fixe</option>
            </select>
          </Field>

          <Field label="Bénéficiaire / Fournisseur">
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              maxLength={150}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="Référence">
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              maxLength={100}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <Field label="Description" className="md:col-span-4">
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={5000}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </Field>

          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {save.isPending ? '…' : editingId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <LoadingState label="Chargement des dépenses…" lines={4} />}
      {isError && (
        <ErrorState error={qerr} fallback="Impossible de charger les dépenses." />
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Nature</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Bénéficiaire</th>
                <th className="px-4 py-3">Réf.</th>
                <th className="px-4 py-3">Statut</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => {
                const cat = categories?.items.find((c) => c.id === e.expense_category_id)
                const isCancelled = e.status === 'cancelled'
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-slate-100 ${
                      isCancelled ? 'text-slate-400 line-through' : ''
                    }`}
                  >
                    <td className="px-4 py-3">{e.expense_date}</td>
                    <td className="px-4 py-3">{cat?.name ?? 'Catégorie non définie'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${
                          e.cost_type === 'fixed'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {e.cost_type === 'fixed' ? 'Fixe' : 'Variable'}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{e.amount}</td>
                    <td className="px-4 py-3">{e.vendor ?? '—'}</td>
                    <td className="px-4 py-3">{e.reference ?? '—'}</td>
                    <td className="px-4 py-3">{e.status}</td>
                    {canManage && (
                      <td className="px-4 py-3 space-x-2">
                        {!isCancelled && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(e)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt(
                                  "Motif d'annulation (optionnel) :",
                                  ''
                                )
                                if (reason !== null) {
                                  cancel.mutate({ id: e.id, reason })
                                }
                              }}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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
                  <td colSpan={canManage ? 8 : 7} className="px-4 py-3">
                    <EmptyState
                      emoji="🧾"
                      title="Aucune dépense"
                      hint="Aucune dépense ne correspond aux filtres sélectionnés."
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
