import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import * as api from '../../api/simpleFinance'
import * as schoolSettingsApi from '../../api/simpleSchoolSettings'
import { ErrorState } from '../../components/ui/ErrorState'
import { useAuth } from '../../contexts/AuthContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatBar } from '../../components/ui/StatBar'
import { getApiErrorMessage } from '../../utils/apiError'

/**
 * Simple finance journal — a notebook, not a dashboard.
 *
 * One screen: month picker → summary tiles → add-entry form → journal table.
 * Does NOT touch the advanced payments/expenses tables — it's a parallel
 * ledger the director can use without any accounting knowledge.
 */
export function SimpleFinancePage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('finance.manage')
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showDeleted, setShowDeleted] = useState(false)
  const [entryTypeFilter, setEntryTypeFilter] = useState<'' | api.FinanceEntryType>('')
  const [costTypeFilter, setCostTypeFilter] = useState<'' | api.FinanceCostType>('')

  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErr, refetch: refetchSummary } = useQuery({
    queryKey: ['simple-finance-summary', month],
    queryFn: () => api.fetchSummary(month),
  })

  const { data: journal, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['simple-finance-journal', month, showDeleted, entryTypeFilter, costTypeFilter],
    queryFn: () =>
      api.fetchJournal({
        month,
        per_page: 200,
        include_deleted: showDeleted || undefined,
        entry_type: entryTypeFilter || undefined,
        cost_type: costTypeFilter || undefined,
      }),
  })

  const { data: schoolHints } = useQuery({
    queryKey: ['simple-school-settings'],
    queryFn: schoolSettingsApi.fetchSimpleSchoolSettings,
    staleTime: 5 * 60 * 1000,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['simple-finance-summary', month] })
    queryClient.invalidateQueries({ queryKey: ['simple-finance-journal', month] })
  }

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteJournalEntry(id),
    onSuccess: refresh,
  })

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="💼"
        title="Journal financier"
        subtitle="Un carnet simple pour noter recettes et dépenses au fil des jours."
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Mois
              </span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="school-input w-40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Type
              </span>
              <select
                value={entryTypeFilter}
                onChange={(e) =>
                  setEntryTypeFilter(e.target.value as '' | api.FinanceEntryType)
                }
                className="school-select w-36"
              >
                <option value="">Tous</option>
                <option value="income">Recettes</option>
                <option value="expense">Dépenses</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Nature
              </span>
              <select
                value={costTypeFilter}
                onChange={(e) =>
                  setCostTypeFilter(e.target.value as '' | api.FinanceCostType)
                }
                className="school-select w-36"
              >
                <option value="">Toutes</option>
                <option value="fixed">Fixes</option>
                <option value="variable">Variables</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs font-semibold text-school-inkmuted">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="h-4 w-4 rounded border-school-line"
              />
              Voir les écritures annulées
            </label>
            <button
              type="button"
              onClick={() =>
                api.exportJournalCsv({
                  month,
                  entry_type: entryTypeFilter || undefined,
                  cost_type: costTypeFilter || undefined,
                })
              }
              className="school-btn-secondary !py-2"
            >
              Export CSV
            </button>
          </div>
        }
      />

      {summaryError && (
        <ErrorState
          error={summaryErr}
          fallback="Impossible de charger les indicateurs financiers."
          onRetry={() => void refetchSummary()}
        />
      )}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger le journal financier."
          onRetry={() => void refetch()}
        />
      )}
      {summary && <SummaryBlock summary={summary} />}
      {summaryLoading && !summary ? <LoadingState label="Chargement des indicateurs…" lines={2} /> : null}

      {canManage && (
        <AddEntryForm
          onSaved={refresh}
          incomeHints={schoolHints?.finance_journal.income_labels ?? []}
          expenseHints={schoolHints?.finance_journal.expense_labels ?? []}
        />
      )}

      {!isLoading && (journal?.items.length ?? 0) === 0 ? (
        <EmptyState
          emoji="📓"
          title="Aucune écriture pour ce mois"
          hint={
            canManage
              ? 'Ajoutez votre première recette ou dépense via le formulaire ci-dessus.'
              : 'Les écritures de ce mois apparaîtront ici dès qu’elles seront enregistrées.'
          }
          action={
            canManage ? (
              <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
                Réessayer
              </button>
            ) : undefined
          }
        />
      ) : (
      <section className="space-y-3">
        <SectionTitle
          emoji="📚"
          title="Écritures du mois"
          hint="Historique des recettes et dépenses saisies."
          iconClassName="bg-school-mist text-school-skydeep"
        />
        <div className="school-table-wrap">
          <table className="school-table">
            <thead>
              <tr>
                <th className="w-28">Date</th>
                <th className="w-24">Type</th>
                <th className="w-28">Catégorie</th>
                <th>Libellé</th>
                <th className="w-20 text-center">Pièce</th>
                <th className="w-32 text-right">Montant</th>
                {canManage && <th className="w-16" />}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-4 py-8 text-center text-school-inkmuted"
                  >
                    Chargement…
                  </td>
                </tr>
              )}
              {(journal?.items ?? []).map((e) => (
                <tr
                  key={e.id}
                  className={[
                    e.entry_type === 'income'
                      ? 'border-l-4 border-school-leaf/70'
                      : 'border-l-4 border-school-coral/70',
                    e.deleted_at ? 'bg-slate-50 italic text-slate-400 line-through' : '',
                  ].join(' ')}
                >
                  <td className="text-school-inkmuted">
                    {new Date(e.entry_date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td>
                    <TypeBadge type={e.entry_type} />
                  </td>
                  <td className="text-xs text-school-inkmuted">{e.category ?? '—'}</td>
                  <td>
                    <div className="font-semibold text-school-ink">{e.label}</div>
                    {e.note && (
                      <div className="text-xs text-school-inkmuted">{e.note}</div>
                    )}
                  </td>
                  <td className="text-center">
                    {e.has_attachment ? (
                      <button
                        type="button"
                        onClick={() => api.downloadJournalAttachment(e.id)}
                        className="text-xs font-bold text-school-grape hover:underline"
                      >
                        Voir
                      </button>
                    ) : (
                      <span className="text-xs text-school-inkmuted">—</span>
                    )}
                  </td>
                  <td
                    className={`text-right font-bold tabular-nums ${
                      e.entry_type === 'income'
                        ? 'text-school-leafdeep'
                        : 'text-[#B23A2E]'
                    }`}
                  >
                    {e.entry_type === 'income' ? '+' : '−'}
                    {formatMoney(parseFloat(e.amount))}
                  </td>
                  {canManage && (
                    <td className="text-right">
                      {!e.deleted_at && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer cette écriture ?'))
                              remove.mutate(e.id)
                          }}
                          className="text-xs font-bold text-[#B23A2E] hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                      {e.deleted_at && (
                        <span className="text-xs text-slate-400">annulée</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  )
}

function SummaryBlock({ summary }: { summary: api.FinanceSummary }) {
  const m = summary.month_totals
  const y = summary.year_totals
  const g = summary.global_totals
  const totalExpense = m.fixed_expense + m.variable_expense
  const totalFlow = m.income + totalExpense
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Recettes du mois" value={m.income} tone="leaf" icon="💰" />
        <Tile label="Charges fixes" value={m.fixed_expense} tone="lilac" icon="🏢" />
        <Tile
          label="Charges variables"
          value={m.variable_expense}
          tone="sun"
          icon="📦"
        />
        <Tile
          label="Solde du mois"
          value={m.net}
          tone={m.net >= 0 ? 'leaf' : 'coral'}
          icon={m.net >= 0 ? '✨' : '⚠️'}
        />
      </div>

      <section className="school-section">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
          Recettes vs dépenses du mois
        </p>
        <StatBar
          value={m.income}
          max={Math.max(1, totalFlow)}
          tone={m.income >= totalExpense ? 'leaf' : 'coral'}
          caption={
            <>
              <b className="text-school-leafdeep">{formatMoney(m.income)}</b> de
              recettes · <b className="text-[#B23A2E]">{formatMoney(totalExpense)}</b>{' '}
              de dépenses
            </>
          }
        />
      </section>

      <div className="school-section flex flex-wrap gap-x-6 gap-y-1 text-sm text-school-inkmuted">
        <span>
          Recettes année {summary.year} :{' '}
          <b className="text-school-leafdeep">{formatMoney(y.income)}</b>
        </span>
        <span>
          Dépenses année {summary.year} :{' '}
          <b className="text-[#B23A2E]">{formatMoney(y.total_expense)}</b>
        </span>
        <span>
          Solde année {summary.year} :{' '}
          <b className={y.net >= 0 ? 'text-school-leafdeep' : 'text-[#B23A2E]'}>
            {formatMoney(y.net)}
          </b>
        </span>
        <span>
          Global recettes :{' '}
          <b className="text-school-leafdeep">{formatMoney(g.income)}</b>
        </span>
        <span>
          Global dépenses :{' '}
          <b className="text-[#B23A2E]">{formatMoney(g.total_expense)}</b>
        </span>
        <span>
          Solde global :{' '}
          <b
            className={g.net >= 0 ? 'text-school-leafdeep' : 'text-[#B23A2E]'}
          >
            {formatMoney(g.net)}
          </b>
        </span>
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'leaf' | 'coral' | 'sun' | 'lilac'
  icon: string
}) {
  const toneClasses = {
    leaf: 'bg-school-leaf/15 text-school-leafdeep',
    coral: 'bg-school-coral/15 text-[#B23A2E]',
    sun: 'bg-school-sun/25 text-[#8A6A00]',
    lilac: 'bg-school-lilac/20 text-[#5b3fa0]',
  }[tone]
  return (
    <div className="school-tile">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-xl ${toneClasses}`}
        >
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
          {label}
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-school-ink sm:text-3xl">
        {formatMoney(value)}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: api.FinanceEntryType }) {
  return type === 'income' ? (
    <span className="school-pill-green">Recette</span>
  ) : (
    <span className="school-pill-coral">Dépense</span>
  )
}

function AddEntryForm({
  onSaved,
  incomeHints,
  expenseHints,
}: {
  onSaved: () => void
  incomeHints: string[]
  expenseHints: string[]
}) {
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [entryType, setEntryType] = useState<api.FinanceEntryType>('expense')
  const [costType, setCostType] = useState<api.FinanceCostType>('variable')
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      api.createJournalEntry({
        entry_date: entryDate,
        entry_type: entryType,
        cost_type: entryType === 'expense' ? costType : null,
        category: category.trim() || null,
        label: label.trim(),
        amount: parseFloat(amount),
        note: note.trim() || null,
        attachment,
      }),
    onSuccess: () => {
      setLabel('')
      setCategory('')
      setAmount('')
      setNote('')
      setAttachment(null)
      setErr(null)
      onSaved()
    },
    onError: (e) =>
      setErr(getApiErrorMessage(e, "Impossible d'ajouter l'écriture.")),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return setErr('Écris un libellé.')
    const n = parseFloat(amount)
    if (Number.isNaN(n) || n < 0) return setErr('Montant invalide.')
    create.mutate()
  }

  const today = new Date().toISOString().slice(0, 10)
  const categorySuggestions =
    entryType === 'income'
      ? ['frais de scolarité', 'inscription', 'cantine', 'transport', 'autres recettes']
      : costType === 'fixed'
        ? ['salaries', 'transport', 'fuel', 'recurring charges']
        : ['insurance', 'accounting', 'miscellaneous invoices', 'supplies', 'repairs']

  return (
    <form onSubmit={submit} className="school-section space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-school-grape/10 text-lg">
            ✏️
          </span>
          <h3 className="font-display text-base font-bold text-school-ink">
            Ajouter dépense ou recette
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setEntryDate(today)}
          className="rounded-full border border-school-line bg-white px-3 py-1 text-xs font-bold text-school-grape transition hover:bg-school-cream"
          title="Mettre la date au jour même"
        >
          📅 Aujourd&apos;hui
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <Field label="Date" className="md:col-span-1">
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="school-input"
          />
        </Field>
        <Field label="Type" className="md:col-span-1">
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as api.FinanceEntryType)}
            className="school-select"
          >
            <option value="expense">Dépense</option>
            <option value="income">Recette</option>
          </select>
        </Field>
        <Field
          label="Nature"
          className={`md:col-span-1 ${entryType === 'income' ? 'opacity-40' : ''}`}
        >
          <select
            disabled={entryType === 'income'}
            value={costType}
            onChange={(e) => setCostType(e.target.value as api.FinanceCostType)}
            className="school-select"
          >
            <option value="fixed">Fixe (salaires…)</option>
            <option value="variable">Variable (factures…)</option>
          </select>
        </Field>
        <Field label="Libellé" className="md:col-span-2">
          <datalist id="pb-finance-income-hints">
            {incomeHints.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          <datalist id="pb-finance-expense-hints">
            {expenseHints.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={160}
            placeholder="Ex. Salaire mars – Mme Dupont"
            className="school-input"
            list={
              entryType === 'income'
                ? 'pb-finance-income-hints'
                : 'pb-finance-expense-hints'
            }
          />
        </Field>
        <Field label="Catégorie" className="md:col-span-1">
          <datalist id="pb-finance-category-hints">
            {categorySuggestions.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={80}
            placeholder="Ex. salaries"
            className="school-input"
            list="pb-finance-category-hints"
          />
        </Field>
        <Field label="Montant (DH)" className="md:col-span-1">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="school-input tabular-nums"
          />
        </Field>
      </div>

      <Field label="Description (optionnel)">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="Détail, numéro de facture, etc."
          className="school-input"
        />
      </Field>
      <Field label="Pièce jointe (optionnel)">
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          className="school-input"
        />
      </Field>

      {err && (
        <p className="text-sm font-semibold text-[#B23A2E]">{err}</p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={create.isPending}
          className="school-btn-primary disabled:opacity-60"
        >
          {create.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
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
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
        {label}
      </span>
      {children}
    </label>
  )
}

function formatMoney(n: number): string {
  return `${n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`
}
