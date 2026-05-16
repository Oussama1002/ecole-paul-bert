import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import * as notificationsApi from '../../api/notifications'
import { formatSchoolDate } from '../ui/SchoolDate'

interface AppHeaderProps {
  onMenuToggle?: () => void
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user, logout, hasPermission } = useAuth()
  const { simpleMode, canToggle, setSimpleMode } = useSimpleMode()
  const canNotif = hasPermission('notifications.view') && !simpleMode
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const { data: indicators } = useQuery({
    queryKey: ['notification-indicators'],
    queryFn: notificationsApi.fetchNotificationIndicators,
    refetchInterval: 60_000,
    enabled: Boolean(user) && canNotif,
  })

  const unread = indicators?.unread_notifications ?? 0
  const today = formatSchoolDate()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false)
      }
    }
    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-school-border/60 bg-school-paper/90 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-school-border/80 bg-white text-school-ink shadow-sm hover:bg-school-mist/30 md:hidden"
          aria-label="Menu de navigation"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
            <rect width="18" height="2" rx="1" fill="currentColor" />
            <rect y="6" width="18" height="2" rx="1" fill="currentColor" />
            <rect y="12" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <span
          className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-school-bubblegum via-school-grape to-school-sky text-xl text-white shadow-school sm:flex"
          aria-hidden
        >
          🎓
        </span>
        <div>
          <h1 className="font-display text-lg font-bold text-school-ink sm:text-xl">
            École Paul Bert
          </h1>
          <p className="hidden text-xs font-medium capitalize text-school-inkmuted sm:block">
            <span aria-hidden className="mr-1">📅</span>
            {today}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {canToggle ? (
          <div
            className="inline-flex items-center gap-1 rounded-full border border-school-lilac/50 bg-white p-1 text-xs font-bold shadow-sm"
            role="group"
            aria-label="Choisir le mode d'affichage"
          >
            <button
              type="button"
              onClick={() => void setSimpleMode(true)}
              className={[
                'rounded-full px-2.5 py-1.5 transition sm:px-3',
                simpleMode
                  ? 'bg-gradient-to-br from-school-bubblegum to-school-grape text-white shadow'
                  : 'text-school-inkmuted hover:text-school-grape',
              ].join(' ')}
              aria-pressed={simpleMode}
              title="Mode simple — affichage minimal pour le quotidien"
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => void setSimpleMode(false)}
              className={[
                'rounded-full px-2.5 py-1.5 transition sm:px-3',
                !simpleMode
                  ? 'bg-gradient-to-br from-school-skydeep to-school-grape text-white shadow'
                  : 'text-school-inkmuted hover:text-school-skydeep',
              ].join(' ')}
              aria-pressed={!simpleMode}
              title="Mode avancé — accès complet à tous les modules"
            >
              Avancé
            </button>
          </div>
        ) : null}
        {user && (
          <div className="hidden items-center gap-2 rounded-2xl border border-school-border/80 bg-white px-3 py-1.5 shadow-sm sm:flex">
            <span className="text-sm font-medium text-school-ink">
              {user.first_name} {user.last_name}
            </span>
            {user.role ? (
              <span className="school-badge max-w-[140px] truncate">
                {user.role.name}
              </span>
            ) : null}
          </div>
        )}
        {canNotif ? (
          <Link
            to="/communications/notifications"
            className="relative rounded-xl border-2 border-school-sky/35 bg-school-mist/40 px-3 py-2 text-base font-semibold text-school-skydeep transition hover:bg-school-mist"
            title="Notifications"
            aria-label="Notifications"
          >
            🔔
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-school-coral px-1 text-[10px] font-bold text-white shadow-sm">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </Link>
        ) : null}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpenMenu((v) => !v)}
            className="rounded-xl border border-school-border/80 bg-white px-3 py-2 text-sm font-semibold text-school-ink shadow-sm hover:bg-school-mist/30"
            aria-haspopup="menu"
            aria-expanded={openMenu}
          >
            👤 Profil
          </button>
          {openMenu ? (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-school-border bg-white p-1 shadow-lg">
              <Link
                to="/profil"
                onClick={() => setOpenMenu(false)}
                className="block rounded-lg px-3 py-2 text-sm text-school-ink hover:bg-school-mist/40"
              >
                Mon profil
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#B23A2E] hover:bg-red-50"
              >
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
