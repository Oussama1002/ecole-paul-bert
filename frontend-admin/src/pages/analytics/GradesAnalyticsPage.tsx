import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LineChart } from '../../components/charts/LineChart'
import { BarChart } from '../../components/charts/BarChart'
import { useGradeAnalytics } from '../../api/analytics'
import { AnalyticsNav } from './AnalyticsNav'
import { ChartCard, Legend, SingleYearNotice, Skeleton } from './AnalyticsShared'
import { PALETTE, formatGrade, formatPercent } from './analyticsFormat'

export function GradesAnalyticsPage() {
  const { data, isLoading, error } = useGradeAnalytics()
  const header = <PageHeader emoji="🎓" title="Analyse des résultats" subtitle="Moyennes, taux de réussite et performance par matière." />

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
        <EmptyState emoji="🎓" title="Aucune donnée" hint="Aucune note enregistrée." />
      </div>
    )
  }
  const current = years[years.length - 1]

  return (
    <div className="space-y-5">
      {header}
      <AnalyticsNav />
      {years.length < 2 && <SingleYearNotice />}

      <ChartCard
        title="Moyenne générale et taux de réussite"
        emoji="📈"
        action={<Legend items={[{ label: 'Moyenne /20', color: PALETTE.blue }, { label: 'Réussite %', color: PALETTE.green }]} />}
      >
        <LineChart
          series={[
            { name: 'Moyenne /20', color: PALETTE.blue, data: years.map((y) => ({ label: y.year, value: y.avg_grade })) },
            { name: 'Réussite %', color: PALETTE.green, data: years.map((y) => ({ label: y.year, value: y.pass_rate })) },
          ]}
          formatValue={(v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
        />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title={`Moyenne par niveau — ${current.year}`} emoji="🏫">
          <BarChart horizontal data={current.by_level.map((l) => ({ label: l.level, value: l.avg_grade }))} formatValue={formatGrade} defaultColor={PALETTE.grape} />
        </ChartCard>

        <ChartCard title={`Matières — ${current.year}`} emoji="🏆">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-school-leafdeep">Top 3</p>
              <BarChart horizontal data={current.top_subjects.map((s) => ({ label: s.subject, value: s.avg_grade }))} formatValue={formatGrade} defaultColor={PALETTE.green} />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#B23A2E]">À renforcer</p>
              <BarChart horizontal data={current.bottom_subjects.map((s) => ({ label: s.subject, value: s.avg_grade }))} formatValue={formatGrade} defaultColor={PALETTE.red} />
            </div>
          </div>
        </ChartCard>
      </div>

      <section className="school-table-wrap">
        <table className="school-table">
          <thead>
            <tr>
              <th>Année</th>
              <th className="text-right">Moyenne générale</th>
              <th className="text-right">Taux de réussite</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.school_year_id}>
                <td className="font-semibold">{y.year}</td>
                <td className="text-right tabular-nums">{formatGrade(y.avg_grade)}</td>
                <td className="text-right tabular-nums">{formatPercent(y.pass_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
