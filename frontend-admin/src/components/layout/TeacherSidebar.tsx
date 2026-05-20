import { useQuery } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import * as simpleSettingsApi from '../../api/simpleSchoolSettings'
import { navEmoji } from './navMeta'

type NavItem = {
  to: string
  label: string
  end?: boolean
  permission?: string
}

const teacherNav: NavItem[] = [
  { to: '/emploi-du-temps', label: 'Emploi du temps', end: true },
  { to: '/communications/annonces', label: 'Annonces', permission: 'announcements.view' },
  { to: '/eleves', label: 'Élèves', permission: 'students.view' },
]

const linkBase =
  'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200'

export function TeacherSidebar() {
  const { hasPermission } = useAuth()

  const items = teacherNav.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  const { data: settings } = useQuery({
    queryKey: ['teacher-sidebar-school'],
    queryFn: simpleSettingsApi.fetchSimpleSchoolSettings,
    staleTime: 10 * 60 * 1000,
  })

  const currentYear = settings?.current_school_year

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/20 bg-school-sidebar shadow-school-lg">
      <div className="px-4 pb-3 pt-6 text-white">
        <div className="flex items-center gap-3 rounded-3xl bg-white/20 p-3 backdrop-blur-sm">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/30 text-2xl shadow-inner"
            aria-hidden
          >
            👩‍🏫
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">Paul Bert</p>
            <p className="text-[11px] font-semibold text-white/85">Espace enseignant</p>
          </div>
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
