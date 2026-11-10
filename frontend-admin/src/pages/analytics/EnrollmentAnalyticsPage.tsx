import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LineChart } from '../../components/charts/LineChart'
import { BarChart } from '../../components/charts/BarChart'
import { useEnrollmentAnalytics } from '../../api/analytics'
import { AnalyticsNav } from './AnalyticsNav'
import { ChartCard, Legend, SingleYearNotice, Skeleton } from './AnalyticsShared'
import { PALETTE, formatNumber } from './analyticsFormat'

export function EnrollmentAnalyticsPage() {
  const { data, isLoading, error } = useEnrollmentAnalytics()
  const header = <PageHeader emoji="🎒" title="Analyse des effectifs" subtitle="Évolution des inscriptions, niveaux, genre et fidélisation." />

  if (isLoading) {
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
        <EmptyState emoji="🎒" title="Aucune donnée" hint="Aucune inscription enregistrée." />
      </div>
    )
  }
  const current = years[years.length - 1]

  return (
    <div className="space-y-5">
      {header}
      <AnalyticsNav />
      {years.length < 2 && <SingleYearNotice />}

      <ChartCard title="Effectif total par année" emoji="📈">
        <LineChart data={years.map((y) => ({ label: y.year, value: y.total }))} color={PALETTE.blue} formatValue={formatNumber} />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title={`Répartition par niveau — ${current.year}`} emoji="🏫">
          <BarChart data={current.by_level.map((l) => ({ label: l.level, value: l.total }))} formatValue={formatNumber} defaultColor={PALETTE.grape} />
        </ChartCard>

        <ChartCard
          title="Répartition par genre"
          emoji="⚧"
          action={<Legend items={[{ label: 'Garçons', color: PALETTE.blue }, { label: 'Filles', color: PALETTE.amber }]} />}
        >
          <LineChart
            series={[
              { name: 'Garçons', color: PALETTE.blue, data: years.map((y) => ({ label: y.year, value: y.by_gender.M })) },
              { name: 'Filles', color: PALETTE.amber, data: years.map((y) => ({ label: y.year, value: y.by_gender.F })) },
            ]}
            formatValue={formatNumber}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Nouveaux vs réinscrits"
        emoji="🔄"
        action={<Legend items={[{ label: 'Nouveaux', color: PALETTE.green }, { label: 'Réinscrits', color: PALETTE.gray }]} />}
      >
        <LineChart
          series={[
            { name: 'Nouveaux', color: PALETTE.green, data: years.map((y) => ({ label: y.year, value: y.new })) },
            { name: 'Réinscrits', color: PALETTE.gray, data: years.map((y) => ({ label: y.year, value: y.returning })) },
          ]}
          formatValue={formatNumber}
        />
      </ChartCard>

      <section className="school-table-wrap">
        <table className="school-table">
          <thead>
            <tr>
              <th>Année</th>
              <th className="text-right">Total</th>
              <th className="text-right">Garçons</th>
              <th className="text-right">Filles</th>
              <th className="text-right">Nouveaux</th>
              <th className="text-right">Réinscrits</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.school_year_id}>
                <td className="font-semibold">{y.year}</td>
                <td className="text-right tabular-nums">{formatNumber(y.total)}</td>
                <td className="text-right tabular-nums">{formatNumber(y.by_gender.M)}</td>
                <td className="text-right tabular-nums">{formatNumber(y.by_gender.F)}</td>
                <td className="text-right tabular-nums">{formatNumber(y.new)}</td>
                <td className="text-right tabular-nums">{formatNumber(y.returning)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
