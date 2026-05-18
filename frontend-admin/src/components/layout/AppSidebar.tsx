import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import * as simpleSettingsApi from '../../api/simpleSchoolSettings'

type NavItem = { to: string; label: string; emoji: string; end?: boolean; permission?: string }
type NavGroup = {
  label: string
  emoji: string
  permission?: string
  items: NavItem[]
}

// ── Navigation structure ────────────────────────────────────────────────────
const standalone: NavItem[] = [
  { to: '/', label: 'Tableau de bord', emoji: '🏠', end: true },
  { to: '/eleves', label: 'Élèves', emoji: '🎒', permission: 'students.view' },
]

const groups: NavGroup[] = [
  {
    label: 'Académique',
    emoji: '📚',
    items: [
      { to: '/assiduite/marquage', label: 'Absences & retards', emoji: '📋', permission: 'attendance.view' },
      { to: '/notes/saisie-classe', label: 'Notes & bulletins', emoji: '✏️', permission: 'grades.view' },
    ],
  },
  {
    label: 'Finance',
    emoji: '💰',
    permission: 'finance.view',
    items: [
      { to: '/finance/bilan',      label: 'Bilan',     emoji: '📊', permission: 'finance.view' },
      { to: '/finance/paiements',  label: 'Paiements', emoji: '💳', permission: 'finance.view' },
      { to: '/finance/factures',   label: 'Factures',  emoji: '📑', permission: 'finance.view' },
      { to: '/finance/depenses',   label: 'Dépenses',  emoji: '🧾', permission: 'finance.view' },
    ],
  },
  {
    label: 'Équipe',
    emoji: '👥',
    items: [
      { to: '/enseignants',    label: 'Enseignants',    emoji: '👩‍🏫', permission: 'teachers.view' },
      { to: '/emploi-du-temps', label: 'Emploi du temps', emoji: '📅', permission: 'schedule.view' },
      { to: '/utilisateurs',   label: 'Utilisateurs',   emoji: '👤', permission: 'users.view' },
    ],
  },
  {
    label: 'Documents',
    emoji: '📁',
    items: [
      { to: '/documents', label: 'Documents', emoji: '📁', permission: 'documents.view' },
    ],
  },
  {
    label: 'Communications',
    emoji: '📢',
    items: [
      { to: '/communications/annonces', label: 'Annonces', emoji: '📢', permission: 'announcements.view' },
      { to: '/communications/audit',    label: 'Audit',    emoji: '🔍', permission: 'audit_logs.view' },
    ],
  },
  {
    label: 'Paramétrage',
    emoji: '⚙️',
    items: [
      { to: '/parametrage/annees-scolaires', label: 'Années scolaires',    emoji: '📆', permission: 'school_years.view' },
      { to: '/parametrage/niveaux',          label: 'Niveaux',             emoji: '🔢', permission: 'levels.view' },
      { to: '/parametrage/classes',          label: 'Classes',             emoji: '🚪', permission: 'classes.view' },
      { to: '/parametrage/matieres',         label: 'Matières',            emoji: '📖', permission: 'subjects.view' },
      { to: '/parametrage/periodes',         label: 'Périodes',            emoji: '⏱️', permission: 'academic_terms.view' },
      { to: '/parametrage/salles',           label: 'Salles',              emoji: '🏫', permission: 'rooms.view' },
      { to: '/parametrage/bulletin-template',label: 'Modèle de bulletin',  emoji: '📄', permission: 'report_cards.view' },
      { to: '/ecole/parametres',             label: 'Réglages école',      emoji: '🛠️', permission: 'report_cards.view' },
    ],
  },
]

// ── Styles ──────────────────────────────────────────────────────────────────
const linkBase =
  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 border-l-4'

export function AppSidebar() {
  const { hasPermission } = useAuth()
  const { pathname } = useLocation()

  const { data: schoolSettings } = useQuery({
    queryKey: ['app-header-school'],
    queryFn: simpleSettingsApi.fetchSimpleSchoolSettings,
    staleTime: 5 * 60_000,
  })
  const logoUrl = schoolSettings?.school.logo_url ?? null
  const schoolName = schoolSettings?.school.name?.trim() || 'Paul Bert'

  const canSee = (item: NavItem) =>
    !item.permission || hasPermission(item.permission)

  // Auto-open any group whose child is currently active
  const initialOpen = (g: NavGroup) =>
    g.items.some((it) => pathname === it.to || (!it.end && pathname.startsWith(it.to + '/')))

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.label, initialOpen(g)]))
  )

  const toggle = (label: string) =>
    setOpen((prev) => ({ ...prev, [label]: !prev[label] }))

  const visibleItems = (items: NavItem[]) => items.filter(canSee)

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-school-border/40 bg-gradient-to-b from-school-skydeep via-school-leaf to-school-leafdeep shadow-school-lg">
      {/* Logo */}
      <div className="px-4 pb-2 pt-5 text-white">
        <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={schoolName}
              className="h-12 w-12 shrink-0 rounded-2xl bg-white object-contain shadow-inner"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 text-2xl shadow-inner" aria-hidden>
              🎓
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-tight tracking-tight">{schoolName}</p>
            <p className="text-xs font-semibold text-white/85">École · Espace équipe</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto rounded-t-[1.75rem] bg-school-paper px-2 py-3 shadow-[0_-12px_40px_rgba(44,62,80,0.12)]">

        {/* Standalone items */}
        {standalone.filter(canSee).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [linkBase, isActive
                ? 'border-school-leaf bg-gradient-to-r from-school-mist/90 to-school-sunsoft/40 text-school-leafdeep shadow-sm'
                : 'border-transparent text-school-inkmuted hover:border-school-sky/30 hover:bg-school-cream/90',
              ].join(' ')
            }
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-base shadow-sm" aria-hidden>
              {item.emoji}
            </span>
            <span className="leading-snug">{item.label}</span>
          </NavLink>
        ))}

        {/* Grouped items */}
        {groups.map((g) => {
          const visible = visibleItems(g.items)
          if (visible.length === 0) return null

          const isOpen = open[g.label]
          const hasActive = g.items.some(
            (it) => pathname === it.to || pathname.startsWith(it.to + '/')
          )

          return (
            <div key={g.label}>
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggle(g.label)}
                className={[
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150 border-l-4',
                  hasActive
                    ? 'border-school-grape/60 bg-school-grape/8 text-school-grape'
                    : 'border-transparent text-school-ink hover:bg-school-cream/80',
                ].join(' ')}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-base shadow-sm" aria-hidden>
                  {g.emoji}
                </span>
                <span className="flex-1 text-left leading-snug">{g.label}</span>
                <span className={`text-xs text-school-inkmuted transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </button>

              {/* Children */}
              {isOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-school-line pl-2">
                  {visible.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-gradient-to-r from-school-mist/90 to-school-sunsoft/40 text-school-leafdeep font-semibold'
                            : 'text-school-inkmuted hover:bg-school-cream/90 hover:text-school-ink',
                        ].join(' ')
                      }
                    >
                      <span className="text-base" aria-hidden>{item.emoji}</span>
                      <span className="leading-snug">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
