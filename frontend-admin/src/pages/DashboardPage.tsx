import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as dashboardApi from '../api/dashboard'
import * as schoolYearsApi from '../api/schoolYears'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../contexts/AuthContext'

const KIND_LABEL: Record<string, string> = {
  admin: 'Administrateur',
  direction: 'Direction / pédagogie',
  teacher: 'Enseignant',
  accountant: 'Comptable',
  hr: 'Ressources humaines',
  minimal: 'Vue réduite',
}

function maxInSeries(points: { absences: number }[]): number {
  return points.reduce((m, p) => Math.max(m, p.absences), 0) || 1
}

export function DashboardPage() {
  const { user } = useAuth()
  const [schoolYearId, setSchoolYearId] = useState<number | ''>('')

  const { data: years } = useQuery({
    queryKey: ['school-years-dashboard'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId !== '') return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', schoolYearId],
    queryFn: () =>
      dashboardApi.fetchDashboard({
        school_year_id: schoolYearId === '' ? undefined : schoolYearId,
      }),
  })

  const absencesScale = useMemo(
    () => (data ? maxInSeries(data.attendance_last_7_days) : 1),
    [data]
  )

  const gradeBarScale = useMemo(() => {
    if (!data?.averages_by_class.length) return 20
    const vals = data.averages_by_class
      .map((r) => r.average)
      .filter((v): v is number => v != null)
    return Math.max(20, ...vals, 1)
  }, [data])

  const kindLabel = data ? KIND_LABEL[data.dashboard_kind] ?? data.dashboard_kind : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Tableau de bord</h2>
          <p className="text-sm text-slate-500">
            {user?.role?.name ?? 'Utilisateur'}
            {kindLabel ? (
              <>
                {' '}
                · <span className="text-slate-600">{kindLabel}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Année scolaire (filtre)</span>
            <select
              value={schoolYearId === '' ? '' : schoolYearId}
              onChange={(e) =>
                setSchoolYearId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="mt-1 min-w-[12rem] rounded border border-slate-300 px-3 py-2"
            >
              <option value="">Courante / toutes</option>
              {years?.items.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.is_current ? ' (courante)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {isLoading && <LoadingState label="Chargement des indicateurs…" lines={5} />}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger le tableau de bord."
          onRetry={() => void refetch()}
        />
      )}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.kpis.total_students != null && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Élèves
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-800">
                  {data.kpis.total_students}
                </p>
              </div>
            )}
            {data.kpis.total_teachers != null && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Enseignants actifs
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-800">
                  {data.kpis.total_teachers}
                </p>
              </div>
            )}
            {data.kpis.total_classes != null && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Classes
                </p>
                <p className="mt-1 text-3xl font-semibold text-slate-800">
                  {data.kpis.total_classes}
                </p>
              </div>
            )}
            {data.attendance_today && (
              <div className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                  Aujourd&apos;hui · assiduité
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-amber-950">
                  <span>
                    Absences :{' '}
                    <strong className="text-lg">{data.attendance_today.absences}</strong>
                  </span>
                  <span>
                    Retards :{' '}
                    <strong className="text-lg">{data.attendance_today.lates}</strong>
                  </span>
                  <span>
                    Présents :{' '}
                    <strong className="text-lg">{data.attendance_today.present}</strong>
                  </span>
                </div>
              </div>
            )}
            {data.unpaid && (
              <div className="rounded-lg border border-rose-100 bg-rose-50/80 p-4 shadow-sm sm:col-span-2 lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-rose-800">
                  Impayés
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-rose-950">
                  <span>
                    Factures : <strong>{data.unpaid.unpaid_invoices}</strong>
                  </span>
                  <span>
                    Montant dû :{' '}
                    <strong>{data.unpaid.unpaid_amount.toLocaleString('fr-FR')}</strong>
                  </span>
                  <span>
                    En retard : <strong>{data.unpaid.overdue_invoices}</strong>
                  </span>
                </div>
              </div>
            )}
          </section>

          {data.finance_summary && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Synthèse finance</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Revenus (paiements)</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {data.finance_summary.revenue_total.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dépenses</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {data.finance_summary.expenses_total.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Net</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {data.finance_summary.net_total.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Impayés (factures)</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {data.finance_summary.unpaid_total.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {data.attendance_last_7_days.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800">
                  Absences (7 jours)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Nombre d&apos;enregistrements « absent » par jour
                </p>
                <div className="mt-4 flex h-40 items-end gap-1 border-b border-slate-200 pb-1">
                  {data.attendance_last_7_days.map((p) => {
                    const h = Math.round((p.absences / absencesScale) * 100)
                    return (
                      <div
                        key={p.date}
                        className="flex flex-1 flex-col items-center gap-1"
                        title={`${p.date} : ${p.absences}`}
                      >
                        <div
                          className="w-full max-w-[2.5rem] rounded-t bg-sky-500/90"
                          style={{ height: `${Math.max(h, p.absences > 0 ? 8 : 2)}%` }}
                        />
                        <span className="text-[10px] text-slate-500">
                          {p.date.slice(5)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {data.payments_by_month.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800">
                  Paiements (6 derniers mois)
                </h3>
                <div className="mt-4 flex h-40 items-end gap-2 border-b border-slate-200 pb-1">
                  {data.payments_by_month.map((p) => {
                    const maxT = Math.max(
                      ...data.payments_by_month.map((x) => x.total),
                      1
                    )
                    const h = Math.round((p.total / maxT) * 100)
                    return (
                      <div
                        key={p.period}
                        className="flex flex-1 flex-col items-center gap-1"
                        title={`${p.period} : ${p.total}`}
                      >
                        <div
                          className="w-full max-w-[2.5rem] rounded-t bg-emerald-500/90"
                          style={{ height: `${Math.max(h, 4)}%` }}
                        />
                        <span className="text-[10px] text-slate-500">{p.period}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          {data.averages_by_class.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">
                Moyennes pondérées par classe
              </h3>
              <p className="text-xs text-slate-500">
                Moyenne des notes pondérées enregistrées
                {data.school_year_id ? ' (année filtrée)' : ''}
              </p>
              <ul className="mt-3 space-y-2">
                {data.averages_by_class.map((row) => {
                  const v = row.average ?? 0
                  const w = Math.min(100, Math.round((v / gradeBarScale) * 100))
                  return (
                    <li key={row.class_id} className="text-sm">
                      <div className="flex justify-between gap-2 text-slate-700">
                        <span>{row.class_name}</span>
                        <span className="font-medium tabular-nums text-slate-900">
                          {row.average != null ? row.average.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Alertes</h3>
              <p className="text-xs text-slate-500">
                Notifications et signalements automatiques
              </p>
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
                {data.alerts.length === 0 && (
                  <li className="text-slate-500">Aucune alerte récente.</li>
                )}
                {data.alerts.map((a, i) => (
                  <li
                    key={`${a.type}-${a.id ?? i}-${a.created_at ?? ''}`}
                    className={`rounded-md border px-3 py-2 ${
                      a.severity === 'warning'
                        ? 'border-amber-200 bg-amber-50/80'
                        : 'border-slate-100 bg-slate-50/80'
                    }`}
                  >
                    <p className="font-medium text-slate-800">{a.title}</p>
                    {a.body && <p className="mt-0.5 text-slate-600">{a.body}</p>}
                    {a.type === 'notification' && a.read_at == null && (
                      <span className="mt-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                        Non lue
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Raccourcis</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.shortcuts.length === 0 && (
                  <p className="text-sm text-slate-500">Aucun raccourci pour vos droits.</p>
                )}
                {data.shortcuts.map((s) => (
                  <Link
                    key={s.path + s.label}
                    to={s.path}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>

              {data.recent_announcements.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Annonces récentes
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    {data.recent_announcements.map((an) => (
                      <li key={an.id} className="rounded border border-slate-100 bg-slate-50/50 px-2 py-2">
                        <p className="font-medium text-slate-800">{an.title}</p>
                        {an.body && (
                          <p className="mt-0.5 line-clamp-2 text-slate-600">{an.body}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </>
      ) : !isLoading && !isError ? (
        <EmptyState
          emoji="📊"
          title="Tableau de bord indisponible"
          hint="Aucune donnée n’est disponible pour l’instant."
          action={
            <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
              Réessayer
            </button>
          }
        />
      ) : null}
    </div>
  )
}
