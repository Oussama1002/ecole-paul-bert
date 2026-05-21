import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import * as financeApi from '../../api/finance'
import { useAuth } from '../../contexts/AuthContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { getApiErrorMessage } from '../../utils/apiError'
import { FEE_FREQUENCY_LABELS, formatMad } from '../../utils/studentFinanceLabels'

type FeeFrequency = 'once' | 'monthly' | 'term' | 'yearly'

const PRESETS: { name: string; code: string; frequency: FeeFrequency; amount: number }[] = [
  { name: 'Frais d\'inscription', code: 'INSCRIPTION', frequency: 'once', amount: 1500 },
  { name: 'Scolarité mensuelle', code: 'MENSUEL', frequency: 'monthly', amount: 800 },
  { name: 'Transport scolaire', code: 'TRANSPORT', frequency: 'monthly', amount: 300 },
  { name: 'Cantine', code: 'CANTINE', frequency: 'monthly', amount: 250 },
]

type FormState = {
  name: string
  code: string
  frequency: FeeFrequency
  default_amount: string
  description: string
  is_active: boolean
}

const emptyForm = (): FormState => ({
  name: '',
  code: '',
  frequency: 'monthly',
  default_amount: '',
  description: '',
  is_active: true,
})

export function FeeTypesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('finance.manage')
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [formErr, setFormErr] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fee-types-all'],
    queryFn: () => financeApi.fetchFeeTypes({ per_page: 100 }),
  })

  const save = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.default_amount)
      if (!form.name.trim() || !form.code.trim()) {
        throw new Error('Nom et code sont obligatoires.')
      }
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase().replace(/\s+/g, '_'),
        frequency: form.frequency,
        default_amount: Number.isNaN(amount) ? 0 : amount,
        is_active: form.is_active,
        description: form.description.trim() || null,
      }
      if (editingId) return financeApi.updateFeeType(editingId, payload)
      return financeApi.createFeeType(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-types-all'] })
      qc.invalidateQueries({ queryKey: ['fee-types-active'] })
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
      setFormErr(null)
    },
    onError: (e) => setFormErr(getApiErrorMessage(e, 'Enregistrement impossible.')),
  })

  function openCreate(preset?: (typeof PRESETS)[number]) {
    setEditingId(null)
    setForm(
      preset
        ? {
            name: preset.name,
            code: preset.code,
            frequency: preset.frequency,
            default_amount: String(preset.amount),
            description: '',
            is_active: true,
          }
        : emptyForm()
    )
    setShowForm(true)
    setFormErr(null)
  }

  function openEdit(ft: financeApi.FeeType) {
    setEditingId(ft.id)
    setForm({
      name: ft.name,
      code: ft.code,
      frequency: ft.frequency as FormState['frequency'],
      default_amount: ft.default_amount,
      description: ft.description ?? '',
      is_active: ft.is_active,
    })
    setShowForm(true)
    setFormErr(null)
  }

  if (isLoading) return <LoadingState label="Types de frais…" />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-school-ink">Types de frais</h1>
        <p className="mt-1 text-sm text-school-inkmuted">
          Définissez ce que les familles doivent payer : inscription (unique), mensualité, transport,
          cantine… Puis assignez ces frais sur la fiche de chaque élève (onglet Finance).
        </p>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openCreate()} className="school-btn-primary text-sm">
            + Nouveau type
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => openCreate(p)}
              className="school-btn-secondary text-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {showForm && canManage && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            save.mutate()
          }}
          className="school-section space-y-3"
        >
          <h2 className="font-display text-lg font-semibold text-school-ink">
            {editingId ? 'Modifier le type' : 'Nouveau type de frais'}
          </h2>
          {formErr && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formErr}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">Libellé *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="school-input"
                placeholder="Scolarité mensuelle"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">Code *</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="school-input font-mono"
                placeholder="MENSUEL"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">Périodicité *</span>
              <select
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value as FormState['frequency'] })
                }
                className="school-select"
              >
                <option value="once">Paiement unique (inscription…)</option>
                <option value="monthly">Mensuel</option>
                <option value="term">Par trimestre</option>
                <option value="yearly">Annuel</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">
                Montant par défaut (MAD)
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.default_amount}
                onChange={(e) => setForm({ ...form, default_amount: e.target.value })}
                className="school-input"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-school-inkmuted">Description</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="school-input"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Actif (visible à l&apos;assignation sur les fiches élèves)
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={save.isPending} className="school-btn-primary text-sm">
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormErr(null)
              }}
              className="school-btn-secondary text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {data?.items.length ? (
        <ul className="space-y-2">
          {data.items.map((ft) => (
            <li
              key={ft.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-school-line bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold text-school-ink">{ft.name}</p>
                <p className="text-xs text-school-inkmuted">
                  {ft.code} · {FEE_FREQUENCY_LABELS[ft.frequency] ?? ft.frequency} ·{' '}
                  {formatMad(ft.default_amount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={ft.is_active ? 'school-pill-green' : 'school-pill-muted'}>
                  {ft.is_active ? 'Actif' : 'Inactif'}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => openEdit(ft)}
                    className="text-sm font-bold text-school-grape hover:underline"
                  >
                    Modifier
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          emoji="💼"
          title="Aucun type de frais"
          hint="Créez inscription, mensualité, transport… puis assignez-les depuis la fiche élève."
        />
      )}
    </div>
  )
}
