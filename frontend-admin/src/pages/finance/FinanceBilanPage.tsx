import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as simpleFinanceApi from '../../api/simpleFinance'
import * as schoolYearsApi from '../../api/schoolYears'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatBar } from '../../components/ui/StatBar'
import { useSimpleMode } from '../../contexts/SimpleModeContext'

type PeriodType = 'monthly' | 'yearly' | 'custom'

const PERIOD_LABELS: Record<PeriodType, string> = {
  monthly: 'Mensuel (mois en cours)',
  yearly: 'Annuel',
  custom: 'Personnalisé',
}

function formatMoney(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH'
}

export function FinanceBilanPage() {
  const { simpleMode } = useSimpleMode()
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const { data: years } = useQuery({
    queryKey: ['school-years-bilan'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
    enabled: !simpleMode,
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId > 0) return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const advancedParams = {
    school_year_id: schoolYearId || undefined,
    period_type: periodType,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  } as const

  const simpleParams: simpleFinanceApi.SimpleBilanParams = {
    period_type: periodType,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }

  const advancedQuery = useQuery({
    queryKey: ['finance-bilan', advancedParams],
    queryFn: () => financeApi.fetchFinanceBilan(advancedParams),
    enabled: !simpleMode,
  })

  const simpleQuery = useQuery({
    queryKey: ['simple-finance-bilan', simpleParams],
    queryFn: () => simpleFinanceApi.fetchSimpleBilan(simpleParams),
    enabled: simpleMode,
  })

  const isLoading = simpleMode ? simpleQuery.isLoading : advancedQuery.isLoading
  const isError = simpleMode ? simpleQuery.isError : advancedQuery.isError
  const error = simpleMode ? simpleQuery.error : advancedQuery.error
  const refetch = simpleMode ? simpleQuery.refetch : advancedQuery.refetch

  const periodLabel = simpleMode
    ? simpleQuery.data?.period.label
    : advancedQuery.data?.period.label

  const selectedYearName = years?.items.find((y) => y.id === schoolYearId)?.name

  const handleExportPdf = () => financeApi.downloadFinanceBilanPdf(advancedParams)
  const handleExportExcel = () => financeApi.downloadFinanceBilanExcel(advancedParams)

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="📊"
        title="Bilan financier"
        subtitle={
          simpleMode
            ? 'Totaux calculés depuis votre journal de caisse.'
            : 'Vue claire des revenus, dépenses, impayés et solde net.'
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="school-btn-secondary"
            >
              {isLoading ? 'Actualisation…' : '↻ Actualiser'}
            </button>
            {!simpleMode && (
              <>
                <button type="button" onClick={handleExportPdf} className="school-btn-secondary">
                  PDF
                </button>
                <button type="button" onClick={handleExportExcel} className="school-btn-secondary">
                  Excel
                </button>
              </>
            )}
          </>
        }
      />

      {/* Hero */}
      <div className="school-hero !from-[#92400E] !via-school-mango !to-school-sun">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Synthèse financière
            </p>
            <p className="mt-1 font-display text-xl font-bold sm:text-2xl">
              {periodLabel ?? PERIOD_LABELS[periodType]}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="school-chip-on-dark">{PERIOD_LABELS[periodType]}</span>
              {!simpleMode && selectedYearName && schoolYearId > 0 && (
                <span className="school-chip-on-dark">{selectedYearName}</span>
              )}
              {simpleMode && (
                <span className="school-chip-on-dark">Mode journal de caisse</span>
              )}
            </div>
          </div>
          {(simpleQuery.data || advancedQuery.data) && (
            <NetBadge
              net={
                simpleMode
                  ? simpleQuery.data!.summary.net_balance
                  : advancedQuery.data!.summary.net_balance
              }
            />
          )}
        </div>
      </div>

      {simpleMode && (
        <div className="rounded-2xl border-2 border-school-mango/40 bg-school-mango/10 px-4 py-3 text-sm font-semibold text-[#92400E]">
          Ce bilan est basé sur les entrées de votre journal de caisse. Pour un bilan comptable
          complet (factures, paiements, impayés), utilisez le mode avancé.
        </div>
      )}

      {/* Filters */}
      <section className="school-section">
        <SectionTitle
          emoji="🔎"
          title="Période"
          hint="Filtrez le bilan par type de période et dates."
          iconClassName="bg-school-sunsoft text-[#8A6A00]"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Type de période
            </span>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="school-select"
            >
              <option value="monthly">Mensuel (mois en cours)</option>
              <option value="yearly">Annuel</option>
              <option value="custom">Personnalisé</option>
            </select>
          </label>
          {!simpleMode && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Année scolaire
              </span>
              <select
                value={schoolYearId || ''}
                onChange={(e) => setSchoolYearId(Number(e.target.value))}
                className="school-select"
              >
                <option value="">Toutes</option>
                {years?.items.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.is_current ? ' (courante)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {periodType !== 'monthly' && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Date début
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="school-input"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Date fin
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="school-input"
                />
              </label>
            </>
          )}
        </div>
      </section>

      {isLoading && <LoadingState label="Chargement du bilan…" lines={4} />}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger le bilan financier."
          onRetry={() => void refetch()}
        />
      )}

      {simpleMode && simpleQuery.data && (
        <SimpleBilanView data={simpleQuery.data} />
      )}

      {!simpleMode && advancedQuery.data && (
        <AdvancedBilanView data={advancedQuery.data} />
      )}

      {!isLoading && !isError && !simpleQuery.data && !advancedQuery.data && (
        <EmptyState
          emoji="📊"
          title="Aucune donnée pour cette période"
          hint="Modifiez les filtres ou attendez que des écritures soient enregistrées."
          action={
            <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
              Actualiser
            </button>
          }
        />
      )}
    </div>
  )
}

function NetBadge({ net }: { net: number }) {
  const positive = net >= 0
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-center backdrop-blur ${
        positive
          ? 'border-school-leaf/50 bg-school-leaf/20'
          : 'border-school-coral/50 bg-school-coral/20'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-white/80">Solde net</p>
      <p className="font-display text-2xl font-bold text-white sm:text-3xl">
        {formatMoney(net)}
      </p>
    </div>
  )
}

function FinanceTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: string
  accent: 'green' | 'coral' | 'sun' | 'sky' | 'grape' | 'mint'
}) {
  const accentClass = {
    green: 'school-accent-green',
    coral: 'school-accent-coral',
    sun: 'school-accent-yellow',
    sky: 'school-accent-blue',
    grape: 'school-accent-purple',
    mint: 'school-accent-mint',
  }[accent]

  const iconBg = {
    green: 'bg-school-leaf/15',
    coral: 'bg-school-coral/15',
    sun: 'bg-school-sun/25',
    sky: 'bg-school-sky/15',
    grape: 'bg-school-grape/15',
    mint: 'bg-school-mint/15',
  }[accent]

  const valueColor = {
    green: 'text-school-leafdeep',
    coral: 'text-[#B23A2E]',
    sun: 'text-[#92400E]',
    sky: 'text-school-skydeep',
    grape: 'text-school-grape',
    mint: 'text-[#0D7377]',
  }[accent]

  return (
    <div className={`school-tile ${accentClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
            {label}
          </p>
          <p className={`mt-1 font-display text-2xl font-bold sm:text-3xl ${valueColor}`}>
            {value}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function MonthlyEvolutionBars({
  rows,
}: {
  rows: { month_label: string; income: number; expenses: number; net_balance: number }[]
}) {
  const filtered = rows.filter((r) => r.income > 0 || r.expenses > 0)
  const maxVal = Math.max(1, ...filtered.flatMap((r) => [r.income, r.expenses]))

  if (filtered.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-medium text-school-inkmuted">
        Aucune écriture pour la période sélectionnée.
      </p>
    )
  }

  return (
    <div className="relative flex h-48 items-end gap-2 rounded-2xl bg-school-bg/50 p-3 pb-1">
      {filtered.map((r) => {
        const hIncome = Math.round((r.income / maxVal) * 100)
        const hExpense = Math.round((r.expenses / maxVal) * 100)
        const shortLabel = r.month_label.split(' ')[0]?.slice(0, 4) ?? r.month_label
        return (
          <div key={r.month_label} className="group flex flex-1 flex-col items-center gap-1">
            <div className="flex h-36 w-full max-w-[3rem] items-end justify-center gap-0.5">
              <div
                className="w-2/5 max-w-[1.1rem] rounded-t-lg bg-gradient-to-t from-school-leafdeep to-school-leaf transition group-hover:from-school-grape group-hover:to-school-bubblegum"
                style={{ height: `${Math.max(hIncome, r.income > 0 ? 8 : 2)}%` }}
                title={`Recettes : ${formatMoney(r.income)}`}
              />
              <div
                className="w-2/5 max-w-[1.1rem] rounded-t-lg bg-gradient-to-t from-school-coral to-school-cherry transition group-hover:from-school-mango group-hover:to-school-sun"
                style={{ height: `${Math.max(hExpense, r.expenses > 0 ? 8 : 2)}%` }}
                title={`Dépenses : ${formatMoney(r.expenses)}`}
              />
            </div>
            <span className="text-[10px] font-semibold capitalize text-school-inkmuted">
              {shortLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BreakdownTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[]
  rows: string[][]
  emptyMessage?: string
}) {
  return (
    <div className="school-table-wrap">
      <table className="school-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-school-inkmuted">
                {emptyMessage ?? 'Aucune donnée.'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={`${i}-${j}`} className={j > 0 ? 'text-right font-semibold' : ''}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function SimpleBilanView({ data }: { data: simpleFinanceApi.SimpleBilan }) {
  const s = data.summary
  const totalFlow = s.total_income + s.total_expenses

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <FinanceTile label="Recettes" value={formatMoney(s.total_income)} icon="💰" accent="green" />
        <FinanceTile label="Dépenses" value={formatMoney(s.total_expenses)} icon="📤" accent="coral" />
        <FinanceTile
          label="Solde net"
          value={formatMoney(s.net_balance)}
          icon={s.net_balance >= 0 ? '✨' : '⚠️'}
          accent={s.net_balance >= 0 ? 'mint' : 'coral'}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <FinanceTile label="Charges fixes" value={formatMoney(s.fixed_expense)} icon="🏢" accent="grape" />
        <FinanceTile
          label="Charges variables"
          value={formatMoney(s.variable_expense)}
          icon="📦"
          accent="sun"
        />
      </section>

      <section className="school-section">
        <StatBar
          value={s.total_income}
          max={Math.max(1, totalFlow)}
          tone={s.total_income >= s.total_expenses ? 'leaf' : 'coral'}
          label={
            <>
              <span>Recettes vs dépenses</span>
              <span className="font-bold text-school-leafdeep">
                {Math.round((s.total_income / Math.max(1, totalFlow)) * 100)}%
              </span>
            </>
          }
          caption={
            <>
              <span className="text-school-leafdeep">{formatMoney(s.total_income)}</span> recettes ·{' '}
              <span className="text-[#B23A2E]">{formatMoney(s.total_expenses)}</span> dépenses
            </>
          }
        />
      </section>

      <section className="school-section">
        <SectionTitle
          emoji="📈"
          title="Évolution mensuelle"
          hint="Recettes et dépenses mois par mois."
          iconClassName="bg-school-sky/20 text-school-skydeep"
        />
        <MonthlyEvolutionBars rows={data.monthly_evolution} />
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-school-inkmuted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-school-leafdeep" />
            Recettes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-school-coral" />
            Dépenses
          </span>
        </div>
        <div className="mt-4">
          <BreakdownTable
            headers={['Mois', 'Recettes', 'Dépenses', 'Net']}
            rows={data.monthly_evolution
              .filter((r) => r.income > 0 || r.expenses > 0)
              .map((r) => [
                r.month_label,
                formatMoney(r.income),
                formatMoney(r.expenses),
                formatMoney(r.net_balance),
              ])}
            emptyMessage="Aucune écriture pour l'année en cours."
          />
        </div>
      </section>
    </div>
  )
}

function AdvancedBilanView({ data }: { data: financeApi.FinanceBilan }) {
  const s = data.summary
  const totalFlow = s.total_income + s.total_expenses

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceTile label="Revenus totaux" value={formatMoney(s.total_income)} icon="💰" accent="green" />
        <FinanceTile label="Dépenses totales" value={formatMoney(s.total_expenses)} icon="📤" accent="coral" />
        <FinanceTile
          label="Solde net"
          value={formatMoney(s.net_balance)}
          icon={s.net_balance >= 0 ? '✨' : '⚠️'}
          accent={s.net_balance >= 0 ? 'mint' : 'coral'}
        />
        <FinanceTile label="Impayés" value={formatMoney(s.unpaid_invoices_total)} icon="⏳" accent="sun" />
      </section>

      <section className="school-section">
        <StatBar
          value={s.total_income}
          max={Math.max(1, totalFlow)}
          tone={s.net_balance >= 0 ? 'leaf' : 'coral'}
          label={
            <>
              <span>Équilibre financier</span>
              <span
                className={`font-bold ${s.net_balance >= 0 ? 'text-school-leafdeep' : 'text-[#B23A2E]'}`}
              >
                {formatMoney(s.net_balance)}
              </span>
            </>
          }
          caption={`${formatMoney(s.total_income)} revenus · ${formatMoney(s.total_expenses)} dépenses`}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FinanceTile
          label="Inscriptions"
          value={formatMoney(s.registrations_revenue)}
          icon="🎒"
          accent="sky"
        />
        <FinanceTile
          label="Mensualités"
          value={formatMoney(s.monthly_fees_revenue)}
          icon="📅"
          accent="sky"
        />
        <FinanceTile
          label="Autres revenus"
          value={formatMoney(s.other_income_revenue)}
          icon="➕"
          accent="sky"
        />
        <FinanceTile
          label="Paiements partiels"
          value={formatMoney(s.partial_payments_total)}
          icon="½"
          accent="sun"
        />
        <FinanceTile
          label="Élèves inscrits"
          value={String(s.registered_students_count)}
          icon="👧"
          accent="grape"
        />
        <FinanceTile
          label="Nouvelles inscriptions"
          value={String(s.new_registrations_count)}
          icon="🆕"
          accent="mint"
        />
      </section>

      <section className="school-section">
        <SectionTitle
          emoji="💵"
          title="Revenus par catégorie"
          iconClassName="bg-school-leaf/20 text-school-leafdeep"
        />
        <BreakdownTable
          headers={['Catégorie', 'Montant total', 'Entrées']}
          rows={data.income_breakdown.map((r) => [
            r.label,
            formatMoney(r.total_amount),
            String(r.entries_count),
          ])}
        />
      </section>

      <section className="school-section">
        <SectionTitle
          emoji="🧾"
          title="Dépenses par catégorie"
          iconClassName="bg-school-coral/20 text-[#B23A2E]"
        />
        <BreakdownTable
          headers={['Type', 'Catégorie', 'Montant total', 'Entrées']}
          rows={data.expense_breakdown.map((r) => [
            r.cost_group === 'fixed' ? 'Fixes' : 'Variables',
            r.label,
            formatMoney(r.total_amount),
            String(r.entries_count),
          ])}
        />
      </section>

      <section className="school-section">
        <SectionTitle
          emoji="📈"
          title="Évolution mensuelle"
          hint="Revenus et dépenses mois par mois."
          iconClassName="bg-school-sky/20 text-school-skydeep"
        />
        <MonthlyEvolutionBars rows={data.monthly_evolution} />
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-school-inkmuted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-school-leafdeep" />
            Revenus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-school-coral" />
            Dépenses
          </span>
        </div>
        <div className="mt-4">
          <BreakdownTable
            headers={['Mois', 'Revenus', 'Dépenses', 'Net']}
            rows={data.monthly_evolution.map((r) => [
              r.month_label,
              formatMoney(r.income),
              formatMoney(r.expenses),
              formatMoney(r.net_balance),
            ])}
          />
        </div>
      </section>
    </div>
  )
}
