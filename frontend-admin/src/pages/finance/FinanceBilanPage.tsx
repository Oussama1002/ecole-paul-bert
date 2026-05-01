import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as simpleFinanceApi from '../../api/simpleFinance'
import * as schoolYearsApi from '../../api/schoolYears'
import { useSimpleMode } from '../../contexts/SimpleModeContext'

type PeriodType = 'monthly' | 'yearly' | 'custom'

export function FinanceBilanPage() {
  const { simpleMode } = useSimpleMode()
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const { data: years } = useQuery({
    queryKey: ['school-years-bilan'],
    queryFn: () => schoolYearsApi.fetchSchoolYears({ per_page: 100, sort_by: 'start_date', sort_order: 'desc' }),
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

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH'

  const handleExportPdf = () => financeApi.downloadFinanceBilanPdf(advancedParams)
  const handleExportExcel = () => financeApi.downloadFinanceBilanExcel(advancedParams)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Bilan financier</h2>
          <p className="text-sm text-slate-500">
            {simpleMode
              ? 'Totaux calculés depuis votre journal de caisse.'
              : 'Vue claire des revenus, dépenses, impayés et solde net.'}
          </p>
        </div>
        {!simpleMode && (
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportPdf} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Télécharger PDF</button>
            <button onClick={handleExportExcel} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Exporter Excel</button>
          </div>
        )}
      </div>

      {simpleMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ce bilan est basé sur les entrées de votre journal de caisse. Pour un bilan comptable complet (factures, paiements, impayés), utilisez le mode avancé.
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Type de période</span>
          <select value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
            <option value="monthly">Mensuel (mois en cours)</option>
            <option value="yearly">Annuel</option>
            <option value="custom">Personnalisé</option>
          </select>
        </label>
        {!simpleMode && (
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Année scolaire</span>
            <select value={schoolYearId || ''} onChange={(e) => setSchoolYearId(Number(e.target.value))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
              <option value="">Toutes</option>
              {years?.items.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </label>
        )}
        {periodType !== 'monthly' && (
          <>
            <label className="block text-sm">
              <span className="text-xs text-slate-500">Date début</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-slate-500">Date fin</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
            </label>
          </>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Chargement du bilan…</p>}
      {isError && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      {simpleMode && simpleQuery.data && (
        <SimpleBilanView data={simpleQuery.data} fmt={fmt} />
      )}

      {!simpleMode && advancedQuery.data && (
        <AdvancedBilanView data={advancedQuery.data} fmt={fmt} />
      )}
    </div>
  )
}

function SimpleBilanView({
  data,
  fmt,
}: {
  data: simpleFinanceApi.SimpleBilan
  fmt: (n: number) => string
}) {
  const s = data.summary
  const netPositive = s.net_balance >= 0
  return (
    <>
      <p className="text-xs text-slate-400">Période : {data.period.label}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Recettes" value={fmt(s.total_income)} tone="emerald" />
        <Kpi label="Dépenses" value={fmt(s.total_expenses)} tone="rose" />
        <Kpi label="Solde net" value={fmt(s.net_balance)} tone={netPositive ? 'emerald' : 'rose'} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Kpi label="Charges fixes" value={fmt(s.fixed_expense)} tone="amber" />
        <Kpi label="Charges variables" value={fmt(s.variable_expense)} tone="amber" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium text-slate-800">Évolution mensuelle</h3>
        <SimpleTable
          headers={['Mois', 'Recettes', 'Dépenses', 'Net']}
          rows={data.monthly_evolution
            .filter((r) => r.income > 0 || r.expenses > 0)
            .map((r) => [r.month_label, fmt(r.income), fmt(r.expenses), fmt(r.net_balance)])}
          emptyMessage="Aucune écriture pour l'année en cours."
        />
      </div>
    </>
  )
}

function AdvancedBilanView({
  data,
  fmt,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  fmt: (n: number) => string
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Revenus totaux" value={fmt(data.summary.total_income)} tone="emerald" />
        <Kpi label="Dépenses totales" value={fmt(data.summary.total_expenses)} tone="rose" />
        <Kpi label="Solde net" value={fmt(data.summary.net_balance)} tone={data.summary.net_balance >= 0 ? 'emerald' : 'rose'} />
        <Kpi label="Impayés" value={fmt(data.summary.unpaid_invoices_total)} tone="amber" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Inscriptions (revenu)" value={fmt(data.summary.registrations_revenue)} tone="emerald" />
        <Kpi label="Mensualités (revenu)" value={fmt(data.summary.monthly_fees_revenue)} tone="emerald" />
        <Kpi label="Autres revenus" value={fmt(data.summary.other_income_revenue)} tone="emerald" />
        <Kpi label="Paiements partiels" value={fmt(data.summary.partial_payments_total)} tone="amber" />
        <Kpi label="Élèves inscrits" value={String(data.summary.registered_students_count)} tone="slate" />
        <Kpi label="Nouvelles inscriptions" value={String(data.summary.new_registrations_count)} tone="slate" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium text-slate-800">Revenus par catégorie</h3>
        <SimpleTable
          headers={['Catégorie', 'Montant total', 'Entrées']}
          rows={data.income_breakdown.map((r: { label: string; total_amount: number; entries_count: number }) => [r.label, fmt(r.total_amount), String(r.entries_count)])}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium text-slate-800">Dépenses par catégorie</h3>
        <SimpleTable
          headers={['Type', 'Catégorie', 'Montant total', 'Entrées']}
          rows={data.expense_breakdown.map((r: { cost_group: string; label: string; total_amount: number; entries_count: number }) => [r.cost_group === 'fixed' ? 'Fixes' : 'Variables', r.label, fmt(r.total_amount), String(r.entries_count)])}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-medium text-slate-800">Évolution mensuelle</h3>
        <SimpleTable
          headers={['Mois', 'Revenus', 'Dépenses', 'Net']}
          rows={data.monthly_evolution.map((r: { month_label: string; income: number; expenses: number; net_balance: number }) => [r.month_label, fmt(r.income), fmt(r.expenses), fmt(r.net_balance)])}
        />
      </div>
    </>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'rose' | 'amber' | 'slate' }) {
  const toneText = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
  }[tone]
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneText}`}>{value}</p>
    </div>
  )
}

function SimpleTable({ headers, rows, emptyMessage }: { headers: string[]; rows: string[][]; emptyMessage?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {headers.map((h) => <th key={h} className="py-2 pr-4">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="py-4 text-center text-slate-400">{emptyMessage ?? 'Aucune donnée.'}</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                {row.map((cell, j) => <td key={`${i}-${j}`} className="py-2 pr-4">{cell}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
