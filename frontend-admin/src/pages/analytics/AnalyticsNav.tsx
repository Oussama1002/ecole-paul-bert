import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/analyses', label: 'Vue d’ensemble', emoji: '📊', end: true },
  { to: '/analyses/effectifs', label: 'Effectifs', emoji: '🎒' },
  { to: '/analyses/finances', label: 'Finances', emoji: '💰' },
  { to: '/analyses/assiduite', label: 'Assiduité', emoji: '📋' },
  { to: '/analyses/resultats', label: 'Résultats', emoji: '🎓' },
]

export function AnalyticsNav() {
  return (
    <nav className="mb-5 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            [
              'inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition',
              isActive
                ? 'border-school-skydeep bg-school-skydeep text-white shadow'
                : 'border-school-line bg-white text-school-inkmuted hover:border-school-skydeep/40 hover:text-school-skydeep',
            ].join(' ')
          }
        >
          <span aria-hidden>{t.emoji}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
