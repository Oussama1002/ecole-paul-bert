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

const SHORTCUT_ICONS: Record<string, string> = {
  '/eleves': '🎒',
  '/enseignants': '👩‍🏫',
  '/classes': '🏫',
  '/notes': '📝',
  '/notes/saisie-classe': '✏️',
  '/assiduite': '📋',
  '/finance': '💰',
  '/ecole/parametres': '⚙️',
  '/annonces': '📢',
  '/emploi-du-temps': '📅',
  '/bulletins': '📄',
}

const SHORTCUT_COLORS: Record<string, string> = {
  '/eleves': 'bg-school-sky/20 text-school-skydeep',
  '/enseignants': 'bg-school-bubblegum/20 text-school-bubblegum',
  '/classes': 'bg-school-grape/20 text-school-grape',
  '/notes': 'bg-school-mango/20 text-[#D97706]',
  '/notes/saisie-classe': 'bg-school-leaf/20 text-school-leafdeep',
  '/assiduite': 'bg-school-lilac/20 text-school-grape',
  '/finance': 'bg-school-sun/30 text-[#92400E]',
  '/ecole/parametres': 'bg-school-bg text-school-inkmuted',
  '/annonces': 'bg-school-coral/20 text-[#B23A2E]',
  '/emploi-du-temps': 'bg-school-mint/20 text-[#0D7377]',
  '/bulletins': 'bg-school-sky/20 text-school-skydeep',
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatCurrency(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }) + ' DH'
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    let start = 0
    const step = Math.max(1, Math.ceil(value / 30))
    const id = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(id) }
      else setDisplay(start)
    }, 25)
    return () => clearInterval(id)
  }, [value])
  return <>{display}</>
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
    () => (data ? data.attendance_last_7_days.reduce((m, p) => Math.max(m, p.absences), 0) || 1 : 1),
    [data]
  )

  const gradeBarScale = useMemo(() => {
    if (!data?.averages_by_class.length) return 20
    const vals = data.averages_by_class
      .map((r) => r.average)
      .filter((v): v is number => v != null)
    return Math.max(20, ...vals, 1)
  }, [data])

  const paymentsMax = useMemo(() => {
    if (!data?.payments_by_month.length) return 1
    return Math.max(...data.payments_by_month.map((x) => x.total), 1)
  }, [data])

  const kindLabel = data ? KIND_LABEL[data.dashboard_kind] ?? data.dashboard_kind : ''
  const firstName = user?.first_name ?? user?.email?.split('@')[0] ?? 'Utilisateur'
  const unreadAlerts = data?.alerts.filter((a) => a.type === 'notification' && a.read_at == null).length ?? 0

  const attendanceTotal = data?.attendance_today
    ? data.attendance_today.present + data.attendance_today.absences + data.attendance_today.lates
    : 0
  const presentPct = attendanceTotal > 0 ? Math.round((data!.attendance_today!.present / attendanceTotal) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <div className="school-hero">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {getGreeting()}, {firstName} !
            </h2>
            <p className="mt-1 text-sm text-white/80">
              {kindLabel && <span className="school-chip-on-dark mr-2">{kindLabel}</span>}
              Voici un aperçu de votre école aujourd&apos;hui
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={schoolYearId === '' ? '' : schoolYearId}
              onChange={(e) =>
                setSchoolYearId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="rounded-2xl border border-white/30 bg-white/15 px-3 py-2 text-sm text-white backdrop-blur transition focus:bg-white/25 focus:outline-none"
            >
              <option value="" className="text-school-ink">Courante / toutes</option>
              {years?.items.map((y) => (
                <option key={y.id} value={y.id} className="text-school-ink">
                  {y.name}{y.is_current ? ' (courante)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-2xl border border-white/30 bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
              title="Actualiser"
            >
              <svg className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
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

      {data && (
        <>
          {/* ── KPI Tiles ── */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.kpis.total_students != null && (
              <div className="school-tile school-accent-blue">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">Élèves</p>
                    <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                      <AnimatedNumber value={data.kpis.total_students} />
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-sky/15 text-2xl">
                    🎒
                  </div>
                </div>
              </div>
            )}
            {data.kpis.total_teachers != null && (
              <div className="school-tile school-accent-pink">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">Enseignants</p>
                    <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                      <AnimatedNumber value={data.kpis.total_teachers} />
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-bubblegum/15 text-2xl">
                    👩‍🏫
                  </div>
                </div>
              </div>
            )}
            {data.kpis.total_classes != null && (
              <div className="school-tile school-accent-purple">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">Classes</p>
                    <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                      <AnimatedNumber value={data.kpis.total_classes} />
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-grape/15 text-2xl">
                    🏫
                  </div>
                </div>
              </div>
            )}
            {data.attendance_today && (
              <div className="school-tile school-accent-green">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">Présence aujourd&apos;hui</p>
                    <p className="mt-1 font-display text-3xl font-bold text-school-leafdeep">
                      {presentPct}%
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-leaf/15 text-2xl">
                    ✅
                  </div>
                </div>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  <span className="school-pill-green">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-school-leafdeep" />
                    {data.attendance_today.present} présents
                  </span>
                  <span className="school-pill-coral">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-school-coral" />
                    {data.attendance_today.absences} abs.
                  </span>
                  <span className="school-pill-sun">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-school-sun" />
                    {data.attendance_today.lates} ret.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ── Finance Summary Strip ── */}
          {data.finance_summary && (
            <section className="school-section">
              <div className="school-section-title mb-4">
                <span className="school-section-title-icon bg-school-sun/20">💰</span>
                Synthèse financière
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border-2 border-school-leaf/20 bg-school-leaf/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-school-leafdeep/70">Revenus</p>
                  <p className="mt-1 font-display text-xl font-bold text-school-leafdeep">
                    {formatCurrency(data.finance_summary.revenue_total)}
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-school-coral/20 bg-school-coral/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-school-coral/70">Dépenses</p>
                  <p className="mt-1 font-display text-xl font-bold text-[#B23A2E]">
                    {formatCurrency(data.finance_summary.expenses_total)}
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-school-sky/20 bg-school-sky/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-school-skydeep/70">Net</p>
                  <p className={`mt-1 font-display text-xl font-bold ${data.finance_summary.net_total >= 0 ? 'text-school-skydeep' : 'text-[#B23A2E]'}`}>
                    {formatCurrency(data.finance_summary.net_total)}
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-school-mango/20 bg-school-mango/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#92400E]/70">Impayés</p>
                  <p className="mt-1 font-display text-xl font-bold text-[#92400E]">
                    {formatCurrency(data.finance_summary.unpaid_total)}
                  </p>
                  {data.unpaid && (
                    <p className="mt-1 text-[11px] font-semibold text-[#92400E]/60">
                      {data.unpaid.unpaid_invoices} factures · {data.unpaid.overdue_invoices} en retard
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Charts Row ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Absences 7 days */}
            {data.attendance_last_7_days.length > 0 && (
              <section className="school-section">
                <div className="school-section-title mb-1">
                  <span className="school-section-title-icon bg-school-sky/20">📊</span>
                  Absences — 7 derniers jours
                </div>
                <p className="mb-4 ml-11 text-xs font-medium text-school-inkmuted">
                  Nombre d&apos;enregistrements « absent » par jour
                </p>
                <div className="flex h-44 items-end gap-2 rounded-2xl bg-school-bg/50 p-3 pb-1">
                  {data.attendance_last_7_days.map((p) => {
                    const h = Math.round((p.absences / absencesScale) * 100)
                    const dayName = new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short' })
                    return (
                      <div key={p.date} className="group flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-school-skydeep opacity-0 transition group-hover:opacity-100">
                          {p.absences}
                        </span>
                        <div
                          className="w-full max-w-[2.5rem] rounded-xl bg-gradient-to-t from-school-skydeep to-school-sky transition-all group-hover:from-school-grape group-hover:to-school-bubblegum"
                          style={{ height: `${Math.max(h, p.absences > 0 ? 12 : 4)}%` }}
                        />
                        <span className="text-[10px] font-semibold text-school-inkmuted capitalize">
                          {dayName}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Payments 6 months */}
            {data.payments_by_month.length > 0 && (
              <section className="school-section">
                <div className="school-section-title mb-1">
                  <span className="school-section-title-icon bg-school-leaf/20">💵</span>
                  Paiements — 6 derniers mois
                </div>
                <p className="mb-4 ml-11 text-xs font-medium text-school-inkmuted">
                  Montant total des paiements par mois
                </p>
                <div className="flex h-44 items-end gap-2 rounded-2xl bg-school-bg/50 p-3 pb-1">
                  {data.payments_by_month.map((p) => {
                    const h = Math.round((p.total / paymentsMax) * 100)
                    const label = p.period.length >= 7
                      ? new Date(p.period + '-01').toLocaleDateString('fr-FR', { month: 'short' })
                      : p.period
                    return (
                      <div key={p.period} className="group flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-school-leafdeep opacity-0 transition group-hover:opacity-100">
                          {(p.total / 1000).toFixed(0)}k
                        </span>
                        <div
                          className="w-full max-w-[2.5rem] rounded-xl bg-gradient-to-t from-school-leafdeep to-school-leaf transition-all group-hover:from-school-grape group-hover:to-school-bubblegum"
                          style={{ height: `${Math.max(h, 6)}%` }}
                        />
                        <span className="text-[10px] font-semibold capitalize text-school-inkmuted">
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ── Class Averages ── */}
          {data.averages_by_class.length > 0 && (
            <section className="school-section">
              <div className="school-section-title mb-1">
                <span className="school-section-title-icon bg-school-grape/20">🎓</span>
                Moyennes pondérées par classe
              </div>
              <p className="mb-4 ml-11 text-xs font-medium text-school-inkmuted">
                Moyenne des notes pondérées{data.school_year_id ? ' (année filtrée)' : ''}
              </p>
              <div className="space-y-3">
                {data.averages_by_class.map((row) => {
                  const v = row.average ?? 0
                  const w = Math.min(100, Math.round((v / gradeBarScale) * 100))
                  const color = v >= 14 ? 'from-school-leafdeep to-school-leaf'
                    : v >= 10 ? 'from-school-skydeep to-school-sky'
                    : v >= 7 ? 'from-school-mango to-school-sun'
                    : 'from-school-coral to-school-cherry'
                  return (
                    <div key={row.class_id} className="group">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-school-ink">{row.class_name}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          v >= 14 ? 'bg-school-leaf/15 text-school-leafdeep'
                          : v >= 10 ? 'bg-school-sky/15 text-school-skydeep'
                          : v >= 7 ? 'bg-school-mango/15 text-[#92400E]'
                          : 'bg-school-coral/15 text-[#B23A2E]'
                        }`}>
                          {row.average != null ? row.average.toFixed(2) : '—'} / {gradeBarScale.toFixed(0)}
                        </span>
                      </div>
                      <div className="school-stat-bar">
                        <div
                          className={`school-stat-bar-fill bg-gradient-to-r ${color}`}
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Bottom Row: Alerts + Shortcuts ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Alerts */}
            <section className="school-section">
              <div className="school-section-title mb-4">
                <span className="school-section-title-icon bg-school-coral/20">🔔</span>
                Alertes
                {unreadAlerts > 0 && (
                  <span className="school-badge-pink ml-2">{unreadAlerts} non lue{unreadAlerts > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {data.alerts.length === 0 && (
                  <div className="school-empty py-6">
                    <span className="school-empty-emoji">🎉</span>
                    <p className="school-empty-title">Tout est calme</p>
                    <p className="school-empty-hint">Aucune alerte récente.</p>
                  </div>
                )}
                {data.alerts.map((a, i) => (
                  <div
                    key={`${a.type}-${a.id ?? i}-${a.created_at ?? ''}`}
                    className={`rounded-2xl border-2 px-4 py-3 transition ${
                      a.severity === 'warning'
                        ? 'border-school-mango/30 bg-school-mango/5'
                        : a.type === 'notification' && a.read_at == null
                          ? 'border-school-sky/30 bg-school-sky/5'
                          : 'border-school-line bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-base">
                        {a.severity === 'warning' ? '⚠️' : a.type === 'notification' && a.read_at == null ? '🔵' : '📌'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-school-ink">{a.title}</p>
                        {a.body && <p className="mt-0.5 text-xs text-school-inkmuted line-clamp-2">{a.body}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Shortcuts + Announcements */}
            <div className="space-y-4">
              <section className="school-section">
                <div className="school-section-title mb-4">
                  <span className="school-section-title-icon bg-school-grape/20">⚡</span>
                  Raccourcis
                </div>
                {data.shortcuts.length === 0 ? (
                  <p className="text-sm font-medium text-school-inkmuted">Aucun raccourci pour vos droits.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {data.shortcuts.map((s) => (
                      <Link
                        key={s.path + s.label}
                        to={s.path}
                        className="school-quick flex-col items-center gap-2 py-4 text-center"
                      >
                        <span className={`school-quick-icon ${SHORTCUT_COLORS[s.path] ?? 'bg-school-bg text-school-inkmuted'}`}>
                          {SHORTCUT_ICONS[s.path] ?? '📁'}
                        </span>
                        <span className="text-xs">{s.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {data.recent_announcements.length > 0 && (
                <section className="school-section">
                  <div className="school-section-title mb-4">
                    <span className="school-section-title-icon bg-school-bubblegum/20">📢</span>
                    Annonces récentes
                  </div>
                  <div className="space-y-2">
                    {data.recent_announcements.map((an) => (
                      <div key={an.id} className="rounded-2xl border-2 border-school-line bg-school-cream/50 px-4 py-3">
                        <p className="text-sm font-bold text-school-ink">{an.title}</p>
                        {an.body && (
                          <p className="mt-1 text-xs text-school-inkmuted line-clamp-2">{an.body}</p>
                        )}
                        {an.published_at && (
                          <p className="mt-1.5 text-[10px] font-semibold text-school-inkmuted/60">
                            {new Date(an.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}

      {!data && !isLoading && !isError && (
        <EmptyState
          emoji="📊"
          title="Tableau de bord indisponible"
          hint="Aucune donnée n'est disponible pour l'instant."
          action={
            <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
              Réessayer
            </button>
          }
        />
      )}
    </div>
  )
}
