import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LineChart } from '../../components/charts/LineChart'
import { BarChart } from '../../components/charts/BarChart'
import { useAttendanceAnalytics } from '../../api/analytics'
import { AnalyticsNav } from './AnalyticsNav'
import { ChartCard, Legend, SingleYearNotice, Skeleton } from './AnalyticsShared'
import { PALETTE, formatNumber, formatPercent } from './analyticsFormat'

export function AttendanceAnalyticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const { data, isLoading, error } = useAttendanceAnalytics(year)
  const header = <PageHeader emoji="📋" title="Analyse de l’assiduité" subtitle="Taux de présence, absences et retards par année." />

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
        <EmptyState emoji="📋" title="Aucune donnée" hint="Aucun pointage d’assiduité enregistré." />
      </div>
    )
  }

  const selected = year ? years.find((y) => y.year === year) : undefined

  return (
    <div className="space-y-5">
      {header}
      <AnalyticsNav />
      {years.length < 2 && <SingleYearNotice />}

      <ChartCard title="Taux de présence par année" emoji="📈">
        <LineChart data={years.map((y) => ({ label: y.year, value: y.avg_rate }))} color={PALETTE.green} formatValue={formatPercent} />
      </ChartCard>

      <ChartCard
        title="Absences et retards"
        emoji="⏰"
        action={<Legend items={[{ label: 'Absences', color: PALETTE.red }, { label: 'Retards', color: PALETTE.amber }]} />}
      >
        <LineChart
          series={[
            { name: 'Absences', color: PALETTE.red, data: years.map((y) => ({ label: y.year, value: y.total_absences })) },
            { name: 'Retards', color: PALETTE.amber, data: years.map((y) => ({ label: y.year, value: y.total_lates })) },
          ]}
          formatValue={formatNumber}
        />
      </ChartCard>

      <ChartCard
        title={selected ? `Taux de présence mensuel — ${selected.year}` : 'Détail mensuel'}
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
          <BarChart data={selected.monthly.map((m) => ({ label: m.month, value: m.rate }))} formatValue={formatPercent} defaultColor={PALETTE.green} />
        ) : (
          <p className="text-sm text-school-inkmuted">Sélectionnez une année dans le tableau pour afficher le détail mensuel.</p>
        )}
      </ChartCard>

      <section className="school-table-wrap">
        <table className="school-table">
          <thead>
            <tr>
              <th>Année</th>
              <th className="text-right">Taux de présence</th>
              <th className="text-right">Absences</th>
              <th className="text-right">Retards</th>
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
                <td className="text-right tabular-nums">{formatPercent(y.avg_rate)}</td>
                <td className="text-right tabular-nums">{formatNumber(y.total_absences)}</td>
                <td className="text-right tabular-nums">{formatNumber(y.total_lates)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
