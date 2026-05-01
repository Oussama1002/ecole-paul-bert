import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import * as dashboardApi from '../api/dashboard'
import { useAuth } from '../contexts/AuthContext'
import { SectionTitle } from '../components/ui/SectionTitle'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import {
  TodayPill,
  formatSchoolDate,
  getGreeting,
} from '../components/ui/SchoolDate'

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'decimal',
  maximumFractionDigits: 0,
})

function formatMoney(n: number): string {
  return `${eur.format(Math.round(n))} DH`
}

type TileTone = 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange'

/**
 * Per-tile accent: the tile card stays white for readability, the emoji
 * bubble + the top accent strip carry the color. Long numbers stay legible
 * and the dashboard reads as one polished family of cards.
 */
const toneBubble: Record<TileTone, string> = {
  pink: 'bg-school-bubblegum/15 text-[#C2185B]',
  blue: 'bg-school-sky/15 text-school-skydeep',
  green: 'bg-school-leaf/15 text-school-leafdeep',
  yellow: 'bg-school-sun/25 text-[#8A6A00]',
  purple: 'bg-school-grape/15 text-school-grape',
  orange: 'bg-school-mango/15 text-[#B45309]',
}

const toneAccentClass: Record<TileTone, string> = {
  pink: 'school-accent-pink',
  blue: 'school-accent-blue',
  green: 'school-accent-green',
  yellow: 'school-accent-yellow',
  purple: 'school-accent-purple',
  orange: 'school-accent-orange',
}

function KpiTile(props: {
  emoji: string
  label: string
  value: string
  tone: TileTone
  sub?: string
}) {
  return (
    <div className={`school-tile ${toneAccentClass[props.tone]}`}>
      <div className="flex items-start justify-between">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm ${toneBubble[props.tone]}`}
        >
          {props.emoji}
        </span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-school-inkmuted">
        {props.label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold text-school-ink">
        {props.value}
      </p>
      {props.sub ? (
        <p className="mt-1 text-xs font-medium text-school-inkmuted">{props.sub}</p>
      ) : null}
    </div>
  )
}

function RevenueChart({
  points,
}: {
  points: dashboardApi.SimpleRevenuePoint[]
}) {
  const max = useMemo(
    () => points.reduce((m, p) => Math.max(m, p.amount), 0) || 1,
    [points]
  )

  if (points.length === 0) {
    return (
      <p className="text-sm text-school-inkmuted">
        Pas encore de paiements enregistrés sur les 6 derniers mois.
      </p>
    )
  }

  const palette = [
    'from-school-bubblegum to-school-grape',
    'from-school-grape to-school-sky',
    'from-school-sky to-school-leaf',
    'from-school-leaf to-school-sun',
    'from-school-sun to-school-mango',
    'from-school-mango to-school-coral',
  ]

  return (
    <div className="relative">
      <div className="flex items-end gap-3 sm:gap-4" style={{ height: 180 }}>
        {points.map((p, i) => {
          const h = Math.max(6, Math.round((p.amount / max) * 150))
          return (
            <div key={p.key} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-school-inkmuted">
                {p.amount > 0 ? formatMoney(p.amount) : '—'}
              </span>
              <div
                className={`w-full rounded-t-2xl bg-gradient-to-t ${palette[i % palette.length]} shadow-sm transition-all duration-300`}
                style={{ height: h }}
                title={`${p.label}: ${formatMoney(p.amount)}`}
              />
              <span className="text-[11px] font-semibold text-school-ink">
                {p.label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-1 h-px bg-school-line" />
    </div>
  )
}

type QuickAction = {
  to: string
  label: string
  hint: string
  emoji: string
  bubble: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: '/eleves/nouveau',
    label: 'Ajouter un élève',
    hint: 'Fiche rapide en 1 minute',
    emoji: '🎒',
    bubble: 'bg-school-mist text-school-skydeep',
  },
  {
    to: '/assiduite/marquage',
    label: 'Présences du jour',
    hint: 'Cocher les présents',
    emoji: '✅',
    bubble: 'bg-school-leaf/15 text-school-leafdeep',
  },
  {
    to: '/finance',
    label: 'Journal financier',
    hint: 'Ajouter dépense',
    emoji: '💼',
    bubble: 'bg-school-sunsoft text-[#8A6A00]',
  },
  {
    to: '/bulletins',
    label: 'Bulletins',
    hint: 'Générer et télécharger',
    emoji: '📄',
    bubble: 'bg-school-grape/15 text-school-grape',
  },
]

export function SimpleDashboardPage() {
  const { user } = useAuth()
  const greeting = getGreeting()
  const today = formatSchoolDate()

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-simple'],
    queryFn: () => dashboardApi.fetchSimpleDashboard(),
  })

  const k = data?.kpis

  return (
    <div className="space-y-6">
      <section className="school-hero">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Tableau de bord — Mode simple
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">
              {greeting}
              {user?.first_name ? `, ${user.first_name}` : ''}{' '}
              <span aria-hidden>👋</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TodayPill date={new Date()} />
              {data?.school_year ? (
                <span className="school-chip-on-dark">
                  <span aria-hidden>🎒</span>
                  Année {data.school_year.name}
                </span>
              ) : (
                <span className="school-chip-on-dark">
                  <span aria-hidden>⚠️</span>
                  Aucune année active
                </span>
              )}
            </div>
            <p className="mt-3 text-sm font-medium text-white/85">
              Voici un aperçu rapide de la vie de l&apos;école aujourd&apos;hui.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-2xl border-2 border-white/60 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </section>

      <section aria-label="Raccourcis" className="school-section">
        <SectionTitle
          emoji="✨"
          title="Que faire aujourd'hui ?"
          hint="Les actions les plus utilisées au quotidien"
          iconClassName="bg-school-sunsoft text-[#8A6A00]"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.to} to={a.to} className="school-quick">
              <span className={`school-quick-icon ${a.bubble}`}>{a.emoji}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{a.label}</span>
                <span className="truncate text-xs font-medium text-school-inkmuted">
                  {a.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {isError ? (
        <ErrorState
          error={error}
          fallback="Impossible de charger le tableau de bord."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && data && !data.school_year && (
        <section className="rounded-3xl border-2 border-school-grape/30 bg-gradient-to-br from-school-grape/5 to-school-sky/10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="text-5xl">🚀</span>
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-school-grape">
                Bienvenue ! Configurez votre première année scolaire.
              </h3>
              <p className="mt-1 text-sm text-school-inkmuted">
                Pour commencer à saisir des présences, des notes et des paiements, créez d'abord une année scolaire et au moins une classe.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/ecole/parametres" className="school-btn-primary">
                  ⚙️ Configurer l'école
                </Link>
                <Link to="/parametrage/passage-annee" className="school-btn-secondary">
                  📅 Créer l'année scolaire
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {isLoading || !k ? (
        <LoadingState label="Chargement du tableau de bord…" lines={6} />
      ) : (
        <>
          <section aria-label="Indicateurs">
            <SectionTitle
              emoji="📊"
              title="Au cœur de l'école"
              hint="Chiffres clés mis à jour en temps réel"
              iconClassName="bg-school-mist text-school-skydeep"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiTile
                emoji="🎒"
                tone="blue"
                label="Élèves inscrits"
                value={k.total_students.toString()}
                sub="Inscriptions actives cette année"
              />
              <KpiTile
                emoji="🌟"
                tone="pink"
                label="Nouvelles inscriptions"
                value={k.new_registrations.toString()}
                sub="Nouveaux élèves cette année"
              />
              <KpiTile
                emoji="🕊️"
                tone="orange"
                label="Départs"
                value={k.students_left.toString()}
                sub="Transferts, arrêts, fin de scolarité"
              />
              <KpiTile
                emoji="📝"
                tone="purple"
                label="Frais d'inscription"
                value={formatMoney(k.registration_revenue)}
                sub="Depuis le début de l'année"
              />
              <KpiTile
                emoji="🌈"
                tone="yellow"
                label="Recettes du mois"
                value={formatMoney(k.monthly_revenue)}
                sub={today.charAt(0).toUpperCase() + today.slice(1)}
              />
              <KpiTile
                emoji="💰"
                tone="green"
                label="Recettes de l'année"
                value={formatMoney(k.global_revenue)}
                sub="Cumul depuis septembre"
              />
              <KpiTile
                emoji="🚨"
                tone="orange"
                label="Enseignants absents"
                value={(k as typeof k & { teacher_absences_today?: number }).teacher_absences_today?.toString() ?? '0'}
                sub="Aujourd'hui"
              />
            </div>
          </section>

          <section className="school-section">
            <SectionTitle
              emoji="📈"
              title="Recettes — 6 derniers mois"
              hint="Encaissements confirmés"
              iconClassName="bg-school-grape/10 text-school-grape"
              actions={<span className="school-pill-grape">Paiements confirmés</span>}
            />
            <RevenueChart points={data.revenue_trend} />
          </section>
        </>
      )}
    </div>
  )
}
