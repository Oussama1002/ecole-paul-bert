import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { navEmoji } from './navMeta'

type NavItem = { to: string; label: string; end?: boolean; permission?: string }

const mainNav: NavItem[] = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/eleves', label: 'Élèves', end: false, permission: 'students.view' },
  {
    to: '/assiduite/marquage',
    label: 'Absences & retards',
    end: false,
    permission: 'attendance.view',
  },
  {
    to: '/notes/saisie-classe',
    label: 'Notes & bulletins',
    end: false,
    permission: 'grades.view',
  },
  {
    to: '/finance',
    label: 'Finance',
    end: true,
    permission: 'finance.view',
  },
  {
    to: '/finance/bilan',
    label: '— Bilan',
    end: false,
    permission: 'finance.view',
  },
  {
    to: '/finance/paiements',
    label: '— Paiements',
    end: false,
    permission: 'finance.view',
  },
  {
    to: '/finance/factures',
    label: '— Factures',
    end: false,
    permission: 'finance.view',
  },
  {
    to: '/finance/depenses',
    label: '— Dépenses',
    end: false,
    permission: 'finance.view',
  },
  {
    to: '/documents',
    label: 'Documents',
    end: false,
    permission: 'documents.view',
  },
  {
    to: '/enseignants',
    label: 'Enseignants',
    end: false,
    permission: 'teachers.view',
  },
  {
    to: '/emploi-du-temps',
    label: 'Emploi du temps',
    end: false,
    permission: 'schedule.view',
  },
  { to: '/utilisateurs', label: 'Utilisateurs', end: false, permission: 'users.view' },
  {
    to: '/communications/annonces',
    label: 'Annonces',
    end: false,
    permission: 'announcements.view',
  },
  {
    to: '/communications/audit',
    label: 'Audit',
    end: false,
    permission: 'audit_logs.view',
  },
]

const paramNav: NavItem[] = [
  {
    to: '/parametrage/annees-scolaires',
    label: 'Années scolaires',
    permission: 'school_years.view',
  },
  { to: '/parametrage/niveaux', label: 'Niveaux', permission: 'levels.view' },
  {
    to: '/parametrage/classes',
    label: 'Classes',
    permission: 'classes.view',
  },
  {
    to: '/parametrage/matieres',
    label: 'Matières',
    permission: 'subjects.view',
  },
  {
    to: '/parametrage/periodes',
    label: 'Périodes & évaluations',
    permission: 'academic_terms.view',
  },
  { to: '/parametrage/salles', label: 'Salles', permission: 'rooms.view' },
  {
    to: '/parametrage/bulletin-template',
    label: 'Modèle de bulletin',
    permission: 'report_cards.view',
  },
  {
    to: '/ecole/parametres',
    label: 'École — réglages simples',
    permission: 'report_cards.view',
  },
]

interface AppSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const linkBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-4'

export function AppSidebar({ isOpen = false, onClose }: AppSidebarProps) {
  const { hasPermission } = useAuth()

  const filterNav = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.permission) {
        return true
      }
      return hasPermission(item.permission)
    })

  const main = filterNav(mainNav)
  const paramFiltered = paramNav.filter((item) => {
    if (item.to === '/parametrage/periodes') {
      return (
        hasPermission('academic_terms.view') ||
        hasPermission('evaluation_periods.view')
      )
    }
    return item.permission ? hasPermission(item.permission) : true
  })

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col',
        'border-r border-school-border/40 bg-gradient-to-b from-school-skydeep via-school-leaf to-school-leafdeep shadow-school-lg',
        'transition-transform duration-300 ease-in-out',
        'md:sticky md:top-0 md:z-auto md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="relative px-4 pb-2 pt-5 text-white">
        <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 text-2xl shadow-inner"
            aria-hidden
          >
            🎓
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-tight tracking-tight">
              Paul Bert
            </p>
            <p className="text-xs font-semibold text-white/85">
              École · Espace équipe
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

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto rounded-t-[1.75rem] bg-school-paper px-2 py-4 shadow-[0_-12px_40px_rgba(44,62,80,0.12)]">
        {main.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                linkBase,
                isActive
                  ? 'border-school-leaf bg-gradient-to-r from-school-mist/90 to-school-sunsoft/40 text-school-leafdeep shadow-sm'
                  : 'border-transparent text-school-inkmuted hover:border-school-sky/30 hover:bg-school-cream/90',
              ].join(' ')
            }
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-lg shadow-sm"
              aria-hidden
            >
              {navEmoji(item.to)}
            </span>
            <span className="leading-snug">{item.label}</span>
          </NavLink>
        ))}

        {paramFiltered.length > 0 && (
          <>
            <p className="mb-1 mt-5 px-3 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-school-inkmuted/70">
              Paramétrage
            </p>
            {paramFiltered.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    linkBase,
                    isActive
                      ? 'border-school-sky bg-school-mist/70 text-school-skydeep shadow-sm'
                      : 'border-transparent text-school-inkmuted hover:border-school-sky/25 hover:bg-school-cream/80',
                  ].join(' ')
                }
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-lg shadow-sm"
                  aria-hidden
                >
                  {navEmoji(item.to)}
                </span>
                <span className="leading-snug">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
