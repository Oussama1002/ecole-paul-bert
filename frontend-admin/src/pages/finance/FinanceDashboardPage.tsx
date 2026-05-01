import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as financeApi from '../../api/finance'
import * as schoolYearsApi from '../../api/schoolYears'
import { MonthlyEvolutionChart } from './MonthlyEvolutionChart'

export function FinanceDashboardPage() {
  const [schoolYearId, setSchoolYearId] = useState<number>(0)
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear())

  const { data: years } = useQuery({
    queryKey: ['school-years-finance'],
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['finance-dashboard', schoolYearId, from, to],
    queryFn: () =>
      financeApi.fetchFinanceDashboard({
        school_year_id: schoolYearId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  })

  const { data: byCat } = useQuery({
    queryKey: ['finance-expenses-by-category', schoolYearId, from, to],
    queryFn: () =>
      financeApi.fetchExpensesByCategory({
        school_year_id: schoolYearId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  })

  const { data: byCostType } = useQuery({
    queryKey: ['finance-expenses-by-cost-type', schoolYearId, from, to],
    queryFn: () =>
      financeApi.fetchExpensesByCostType({
        school_year_id: schoolYearId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  })

  const { data: overdue } = useQuery({
    queryKey: ['finance-overdue', schoolYearId],
    queryFn: () =>
      financeApi.fetchOverdueInvoices({
        school_year_id: schoolYearId || undefined,
        per_page: 20,
      }),
  })

  const { data: evolution } = useQuery({
    queryKey: ['finance-monthly-evolution', schoolYearId, chartYear],
    queryFn: () =>
      financeApi.fetchMonthlyEvolution({
        school_year_id: schoolYearId || undefined,
        year: chartYear,
      }),
  })

  const fmt = (n: number | string) =>
    Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalCatPct = (val: number) => {
    const total = byCat?.reduce((s, c) => s + c.total, 0) ?? 0
    return total > 0 ? (val / total) * 100 : 0
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Dashboard finance</h2>
          <p className="text-sm text-slate-500">
            Revenus, dépenses, impayés, retards, évolution mensuelle, exports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              financeApi.downloadPaymentsExport({
                school_year_id: schoolYearId || undefined,
                from: from || undefined,
                to: to || undefined,
              })
            }
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Export paiements (Excel)
          </button>
          <button
            type="button"
            onClick={() =>
              financeApi.downloadExpensesExport({
                school_year_id: schoolYearId || undefined,
                from: from || undefined,
                to: to || undefined,
              })
            }
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Export dépenses (Excel)
          </button>
          <button
            type="button"
            onClick={() =>
              financeApi.downloadFinanceSummaryPdf({
                school_year_id: schoolYearId || undefined,
                from: from || undefined,
                to: to || undefined,
              })
            }
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Rapport PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Année scolaire</span>
          <select
            value={schoolYearId || ''}
            onChange={(e) => setSchoolYearId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Toutes</option>
            {years?.items.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Du</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Au</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Année du graphique</span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={chartYear}
            onChange={(e) => setChartYear(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Chargement…</p>}
      {isError && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      {data && (
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Revenus" value={fmt(data.revenue_total)} tone="emerald" />
          <KpiCard label="Dépenses" value={fmt(data.expenses_total)} tone="rose" />
          <KpiCard
            label="Net"
            value={fmt(data.net_total)}
            tone={data.net_total >= 0 ? 'emerald' : 'rose'}
          />
          <KpiCard label="Impayés" value={fmt(data.unpaid_total)} tone="amber" />
        </div>
      )}

      {byCostType && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Coûts fixes</p>
            <p className="mt-1 text-2xl font-semibold text-purple-700">
              {fmt(byCostType.fixed_total)}
            </p>
            <p className="text-xs text-slate-500">{byCostType.fixed_count} dépense(s)</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Coûts variables</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {fmt(byCostType.variable_total)}
            </p>
            <p className="text-xs text-slate-500">{byCostType.variable_count} dépense(s)</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-slate-800">
          Évolution mensuelle — {evolution?.year ?? chartYear}
        </h3>
        {evolution && evolution.items.length > 0 ? (
          <MonthlyEvolutionChart items={evolution.items} />
        ) : (
          <p className="text-sm text-slate-500">Aucune donnée pour cette année.</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-medium text-slate-800">Dépenses par catégorie</h3>
          {byCat && byCat.length > 0 ? (
            <ul className="space-y-2">
              {byCat.map((c) => (
                <li key={c.expense_category_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className="tabular-nums text-slate-600">
                      {fmt(c.total)} ({c.count})
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${totalCatPct(c.total)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucune dépense.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center justify-between font-medium text-slate-800">
            <span>Factures en retard</span>
            {overdue && overdue.count_overdue > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                {overdue.count_overdue} · {fmt(overdue.total_overdue)}
              </span>
            )}
          </h3>
          {overdue && overdue.items.length > 0 ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-1">N°</th>
                    <th className="py-1">Élève</th>
                    <th className="py-1">Échéance</th>
                    <th className="py-1 text-right">Retard (j)</th>
                    <th className="py-1 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.items.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100">
                      <td className="py-1">{inv.invoice_number ?? 'Sans numéro'}</td>
                      <td className="py-1">{inv.student_name ?? 'Élève non identifié'}</td>
                      <td className="py-1">{inv.due_date}</td>
                      <td className="py-1 text-right tabular-nums text-red-600">
                        {inv.days_overdue ?? '—'}
                      </td>
                      <td className="py-1 text-right tabular-nums">{inv.amount_due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucune facture en retard.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'rose' | 'amber'
}) {
  const toneText = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
  }[tone]
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneText}`}>{value}</p>
    </div>
  )
}
