import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LineChart } from '../../components/charts/LineChart'
import { BarChart } from '../../components/charts/BarChart'
import { ComparisonCard } from '../../components/charts/ComparisonCard'
import {
  useAnalyticsSummary,
  useEnrollmentAnalytics,
  useFinanceAnalytics,
  useAttendanceAnalytics,
  useGradeAnalytics,
} from '../../api/analytics'
import { AnalyticsNav } from './AnalyticsNav'
import { ChartCard, Legend, SingleYearNotice, Skeleton } from './AnalyticsShared'
import {
  PALETTE,
  formatGrade,
  formatMoneyShort,
  formatNumber,
  formatPercent,
  pctChange,
} from './analyticsFormat'

function DetailLink({ to }: { to: string }) {
  return (
    <Link to={to} className="text-sm font-bold text-school-skydeep underline-offset-4 hover:underline">
      Voir détails →
    </Link>
  )
}

export function AnalyticsDashboardPage() {
  const summary = useAnalyticsSummary()
  const enrollment = useEnrollmentAnalytics()
  const finance = useFinanceAnalytics()
  const attendance = useAttendanceAnalytics()
  const grades = useGradeAnalytics()

  const loading =
    summary.isLoading || enrollment.isLoading || finance.isLoading || attendance.isLoading || grades.isLoading
  const error = summary.error ?? enrollment.error ?? finance.error ?? attendance.error ?? grades.error

  const header = <PageHeader emoji="📈" title="Analyses pluriannuelles" subtitle="Tendances sur l’ensemble des années scolaires." />

  if (loading) {
    return (
      <div className="space-y-5">
        {header}
        <AnalyticsNav />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
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

  const sum = summary.data ?? []
  const enr = enrollment.data ?? []
  const fin = finance.data ?? []
  const att = attendance.data ?? []
  const grd = grades.data ?? []

  if (sum.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <AnalyticsNav />
        <EmptyState emoji="📊" title="Aucune donnée" hint="Aucune année scolaire n’a encore de données à analyser." />
      </div>
    )
  }

  const singleYear = sum.length < 2
  const last = sum[sum.length - 1]
  const prev = sum[sum.length - 2]
  const curEnr = enr[enr.length - 1]

  const cmp = (curr: number, previous: number | undefined) => (previous === undefined ? 0 : pctChange(curr, previous))

  return (
    <div className="space-y-5">
      {header}
      <AnalyticsNav />
      {singleYear && <SingleYearNotice />}

      {/* Comparison cards: current vs previous year */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ComparisonCard
          title="Effectif"
          emoji="🎒"
          currentValue={formatNumber(last.enrollment_total)}
          previousValue={prev ? formatNumber(prev.enrollment_total) : '—'}
          trend={cmp(last.enrollment_total, prev?.enrollment_total)}
        />
        <ComparisonCard
          title="Taux de recouvrement"
          emoji="💰"
          currentValue={formatPercent(last.collection_rate)}
          previousValue={prev ? formatPercent(prev.collection_rate) : '—'}
          trend={cmp(last.collection_rate, prev?.collection_rate)}
        />
        <ComparisonCard
          title="Assiduité"
          emoji="📋"
          currentValue={formatPercent(last.attendance_rate)}
          previousValue={prev ? formatPercent(prev.attendance_rate) : '—'}
          trend={cmp(last.attendance_rate, prev?.attendance_rate)}
        />
        <ComparisonCard
          title="Moyenne générale"
          emoji="🎓"
          currentValue={formatGrade(last.avg_grade)}
          previousValue={prev ? formatGrade(prev.avg_grade) : '—'}
          trend={cmp(last.avg_grade, prev?.avg_grade)}
        />
        <ComparisonCard
          title="Ratio élèves/enseignant"
          emoji="👩‍🏫"
          currentValue={last.student_teacher_ratio.toLocaleString('fr-FR')}
          previousValue={prev ? prev.student_teacher_ratio.toLocaleString('fr-FR') : '—'}
          trend={cmp(last.student_teacher_ratio, prev?.student_teacher_ratio)}
          invert
        />
      </div>

      {/* Enrollment */}
      <ChartCard title="Évolution des effectifs" emoji="🎒" action={<DetailLink to="/analyses/effectifs" />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Effectif total par année</p>
            <LineChart
              data={enr.map((e) => ({ label: e.year, value: e.total }))}
              color={PALETTE.blue}
              formatValue={formatNumber}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Par niveau — {curEnr?.year ?? ''}
            </p>
            <BarChart
              data={(curEnr?.by_level ?? []).map((l) => ({ label: l.level, value: l.total }))}
              formatValue={formatNumber}
              defaultColor={PALETTE.grape}
            />
          </div>
        </div>
      </ChartCard>

      {/* Finance */}
      <ChartCard title="Évolution financière" emoji="💰" action={<DetailLink to="/analyses/finances" />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Facturé vs encaissé</p>
              <Legend items={[{ label: 'Facturé', color: PALETTE.blue }, { label: 'Encaissé', color: PALETTE.green }]} />
            </div>
            <LineChart
              series={[
                { name: 'Facturé', color: PALETTE.blue, data: fin.map((f) => ({ label: f.year, value: f.invoiced })) },
                { name: 'Encaissé', color: PALETTE.green, data: fin.map((f) => ({ label: f.year, value: f.collected })) },
              ]}
              formatValue={formatMoneyShort}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Taux de recouvrement</p>
            <BarChart
              data={fin.map((f) => ({ label: f.year, value: f.collection_rate }))}
              formatValue={formatPercent}
              defaultColor={PALETTE.amber}
            />
          </div>
        </div>
      </ChartCard>

      {/* Attendance */}
      <ChartCard title="Assiduité" emoji="📋" action={<DetailLink to="/analyses/assiduite" />}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Taux de présence par année</p>
        <LineChart data={att.map((a) => ({ label: a.year, value: a.avg_rate }))} color={PALETTE.green} formatValue={formatPercent} />
      </ChartCard>

      {/* Grades */}
      <ChartCard title="Résultats scolaires" emoji="🎓" action={<DetailLink to="/analyses/resultats" />}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Taux de réussite par année</p>
            <LineChart data={grd.map((g) => ({ label: g.year, value: g.pass_rate }))} color={PALETTE.blue} formatValue={formatPercent} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Moyenne par matière — {grd[grd.length - 1]?.year ?? ''}
            </p>
            <BarChart
              horizontal
              data={[...(grd[grd.length - 1]?.top_subjects ?? []), ...(grd[grd.length - 1]?.bottom_subjects ?? [])]
                .filter((s, i, arr) => arr.findIndex((x) => x.subject === s.subject) === i)
                .map((s) => ({ label: s.subject, value: s.avg_grade }))}
              formatValue={formatGrade}
              defaultColor={PALETTE.grape}
            />
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
