import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LineChart } from '../../components/charts/LineChart'
import { BarChart } from '../../components/charts/BarChart'
import { useFinanceAnalytics } from '../../api/analytics'
import { AnalyticsNav } from './AnalyticsNav'
import { ChartCard, Legend, SingleYearNotice, Skeleton } from './AnalyticsShared'
import { PALETTE, formatMoney, formatMoneyShort, formatPercent } from './analyticsFormat'

export function FinanceAnalyticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const { data, isLoading, error } = useFinanceAnalytics(year)
  const header = <PageHeader emoji="💰" title="Analyse financière" subtitle="Facturation, encaissements, dépenses et résultat net par année." />

  if (isLoading && !data) {
    return (
      <div className="space-y-5">
        {header}
        <AnalyticsNav />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="space-y-5">
        {header}
        <AnalyticsNav />
        <ErrorState error={error} />
      </div>
    )
  }

  const years = data ?? []
  if (years.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <AnalyticsNav />
        <EmptyState emoji="💰" title="Aucune donnée" hint="Aucune donnée financière enregistrée." />
      </div>
    )
  }

  const selected = year ? years.find((y) => y.year === year) : undefined

  return (
    <div className="space-y-5">
      {header}
      <AnalyticsNav />
      {years.length < 2 && <SingleYearNotice />}

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Facturé vs encaissé"
          emoji="📈"
          action={<Legend items={[{ label: 'Facturé', color: PALETTE.blue }, { label: 'Encaissé', color: PALETTE.green }]} />}
        >
          <LineChart
            series={[
              { name: 'Facturé', color: PALETTE.blue, data: years.map((y) => ({ label: y.year, value: y.invoiced })) },
              { name: 'Encaissé', color: PALETTE.green, data: years.map((y) => ({ label: y.year, value: y.collected })) },
            ]}
            formatValue={formatMoneyShort}
          />
        </ChartCard>

        <ChartCard title="Taux de recouvrement" emoji="🎯">
          <BarChart data={years.map((y) => ({ label: y.year, value: y.collection_rate }))} formatValue={formatPercent} defaultColor={PALETTE.amber} />
        </ChartCard>

        <ChartCard title="Dépenses par année" emoji="🧾">
          <BarChart data={years.map((y) => ({ label: y.year, value: y.expenses }))} formatValue={formatMoneyShort} defaultColor={PALETTE.red} />
        </ChartCard>

        <ChartCard title="Résultat net" emoji="⚖️">
          <LineChart data={years.map((y) => ({ label: y.year, value: y.net }))} color={PALETTE.green} formatValue={formatMoneyShort} />
        </ChartCard>
      </div>

      {/* Drill-down */}
      <ChartCard
        title={selected ? `Détail mensuel — ${selected.year}` : 'Détail mensuel'}
        emoji="🔎"
        action={
          selected ? (
            <button type="button" onClick={() => setYear(undefined)} className="text-sm font-semibold text-school-skydeep hover:underline">
              ✕ Fermer
            </button>
          ) : (
            <span className="text-xs font-medium text-school-inkmuted">Cliquez sur une année ci-dessous</span>
          )
        }
      >
        {selected ? (
          <>
            <Legend
              items={[
                { label: 'Facturé', color: PALETTE.blue },
                { label: 'Encaissé', color: PALETTE.green },
                { label: 'Dépenses', color: PALETTE.red },
              ]}
            />
            <div className="mt-3 space-y-5">
              <BarChart data={selected.monthly.map((m) => ({ label: m.month, value: m.collected }))} formatValue={formatMoneyShort} defaultColor={PALETTE.green} height={200} />
              <div className="grid gap-5 lg:grid-cols-2">
                <BarChart data={selected.monthly.map((m) => ({ label: m.month, value: m.invoiced }))} formatValue={formatMoneyShort} defaultColor={PALETTE.blue} height={180} />
                <BarChart data={selected.monthly.map((m) => ({ label: m.month, value: m.expenses }))} formatValue={formatMoneyShort} defaultColor={PALETTE.red} height={180} />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-school-inkmuted">Sélectionnez une année dans le tableau pour afficher la ventilation mensuelle.</p>
        )}
      </ChartCard>

      <section className="school-table-wrap">
        <table className="school-table">
          <thead>
            <tr>
              <th>Année</th>
              <th className="text-right">Facturé</th>
              <th className="text-right">Encaissé</th>
              <th className="text-right">Recouvrement</th>
              <th className="text-right">Dépenses</th>
              <th className="text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr
                key={y.school_year_id}
                onClick={() => setYear(y.year)}
                className={`cursor-pointer transition hover:bg-school-mist/30 ${selected?.year === y.year ? 'bg-school-mist/40' : ''}`}
              >
                <td className="font-semibold text-school-skydeep">{y.year}</td>
                <td className="text-right tabular-nums">{formatMoney(y.invoiced)}</td>
                <td className="text-right tabular-nums">{formatMoney(y.collected)}</td>
                <td className="text-right tabular-nums">{formatPercent(y.collection_rate)}</td>
                <td className="text-right tabular-nums">{formatMoney(y.expenses)}</td>
                <td className={`text-right font-semibold tabular-nums ${y.net >= 0 ? 'text-school-leafdeep' : 'text-[#B23A2E]'}`}>{formatMoney(y.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
