import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import * as schoolYearsApi from '../../api/schoolYears'
import { navEmoji } from './navMeta'

type NavItem = { to: string; label: string; end?: boolean; permission?: string }

/**
 * Simple-mode sidebar: only the essentials for a primary-school director.
 * Advanced settings (paramétrage, audit, emploi du temps, etc.) are hidden.
 *
 * Visual identity:
 *  - rainbow header (school-sidebar gradient) with mascot
 *  - rounded "card" nav items with colorful icon bubbles
 *  - footer "année scolaire" chip so the team always sees the current year
 */
const simpleNav: NavItem[] = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/ecole/parametres', label: 'École' },
  { to: '/eleves', label: 'Élèves', permission: 'students.view' },
  { to: '/assiduite/marquage', label: 'Absences', permission: 'attendance.view' },
  { to: '/bulletins', label: 'Bulletins', permission: 'report_cards.view' },
  { to: '/finance', label: 'Caisse', permission: 'finance.view' },
  { to: '/finance/bilan', label: 'Bilan', permission: 'finance.view' },
  { to: '/enseignants', label: 'Enseignants', permission: 'teachers.view' },
  { to: '/communications/annonces', label: 'Annonces', permission: 'announcements.view' },
]

interface SimpleSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const linkBase =
  'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200'

export function SimpleSidebar({ isOpen = false, onClose }: SimpleSidebarProps) {
  const { hasPermission } = useAuth()

  const items = simpleNav.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  const { data: years } = useQuery({
    queryKey: ['simple-sidebar-current-year'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({ per_page: 5, is_current: true }),
    staleTime: 10 * 60 * 1000,
  })
  const currentYear = years?.items.find((y) => y.is_current) ?? years?.items[0]

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col',
        'border-r border-white/20 bg-school-sidebar shadow-school-lg',
        'transition-transform duration-300 ease-in-out',
        'md:sticky md:top-0 md:z-auto md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="px-4 pb-3 pt-6 text-white">
        <div className="flex items-center gap-3 rounded-3xl bg-white/20 p-3 backdrop-blur-sm">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/30 text-2xl shadow-inner animate-wiggle-soft"
            aria-hidden
          >
            🎓
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">
              Paul Bert
            </p>
            <p className="text-[11px] font-semibold text-white/85">
              Mode simple
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 md:hidden"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-t-[2rem] bg-school-paper px-3 py-5 shadow-[0_-12px_40px_rgba(142,92,255,0.15)]">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                linkBase,
                isActive
                  ? 'bg-gradient-to-r from-school-bubblegum/15 via-school-lilac/20 to-school-sky/15 text-school-grape shadow-school-pop'
                  : 'text-school-inkmuted hover:bg-school-cream hover:text-school-ink',
              ].join(' ')
            }
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-school-sunsoft to-white text-xl shadow-sm transition-transform group-hover:scale-105"
              aria-hidden
            >
              {navEmoji(item.to)}
            </span>
            <span className="leading-snug">{item.label}</span>
          </NavLink>
        ))}

        <div className="mt-auto pt-4">
          <div className="rounded-3xl border-2 border-school-line bg-gradient-to-br from-white to-school-mist/40 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-school-inkmuted">
              Année scolaire
            </p>
            <p className="mt-0.5 font-display text-sm font-bold text-school-grape">
              {currentYear?.name ?? '—'}
            </p>
          </div>
        </div>
      </nav>
    </aside>
  )
}
