import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import * as notificationsApi from '../../api/notifications'
import * as simpleSettingsApi from '../../api/simpleSchoolSettings'
import { formatSchoolDate } from '../ui/SchoolDate'

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h} h`
  const days = Math.floor(h / 24)
  if (days < 7) return `Il y a ${days} j`
  return d.toLocaleDateString('fr-FR')
}

export function AppHeader() {
  const { user, logout, hasPermission } = useAuth()
  const { simpleMode, canToggle, setSimpleMode } = useSimpleMode()
  const queryClient = useQueryClient()
  const canNotif = hasPermission('notifications.view') && !simpleMode
  const [openMenu, setOpenMenu] = useState(false)
  const [openNotif, setOpenNotif] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)

  const { data: indicators } = useQuery({
    queryKey: ['notification-indicators'],
    queryFn: notificationsApi.fetchNotificationIndicators,
    refetchInterval: 60_000,
    enabled: Boolean(user) && canNotif,
  })

  const { data: schoolSettings } = useQuery({
    queryKey: ['app-header-school'],
    queryFn: simpleSettingsApi.fetchSimpleSchoolSettings,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  })

  const logoUrl = schoolSettings?.school.logo_url ?? null
  const schoolName = schoolSettings?.school.name?.trim() || 'École Paul Bert'

  const { data: notifList, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications-popup'],
    queryFn: () => notificationsApi.fetchNotifications({ per_page: 8 }),
    enabled: Boolean(user) && canNotif && openNotif,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-popup'] })
      queryClient.invalidateQueries({ queryKey: ['notification-indicators'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-popup'] })
      queryClient.invalidateQueries({ queryKey: ['notification-indicators'] })
    },
  })

  const unread = indicators?.unread_notifications ?? 0
  const today = formatSchoolDate()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setOpenNotif(false)
      }
    }
    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-school-border/60 bg-school-paper/90 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={schoolName}
            className="hidden h-11 w-11 rounded-2xl border border-school-border/60 bg-white object-contain shadow-school sm:block"
          />
        ) : (
          <span
            className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-school-bubblegum via-school-grape to-school-sky text-xl text-white shadow-school sm:flex"
            aria-hidden
          >
            🎓
          </span>
        )}
        <div>
          <h1 className="font-display text-lg font-bold text-school-ink sm:text-xl">
            {schoolName}
          </h1>
          <p className="text-xs font-medium capitalize text-school-inkmuted">
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
                'rounded-full px-3 py-1.5 transition',
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
                'rounded-full px-3 py-1.5 transition',
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
          <div className="flex items-center gap-2 rounded-2xl border border-school-border/80 bg-white px-3 py-1.5 shadow-sm">
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
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setOpenNotif((v) => !v)}
              className="relative rounded-xl border-2 border-school-sky/35 bg-school-mist/40 px-3 py-2 text-base font-semibold text-school-skydeep transition hover:bg-school-mist"
              title="Notifications"
              aria-label="Notifications"
              aria-haspopup="menu"
              aria-expanded={openNotif}
            >
              🔔
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-school-coral px-1 text-[10px] font-bold text-white shadow-sm">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </button>

            {openNotif ? (
              <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border-2 border-school-border bg-white shadow-xl sm:w-96">
                <div className="flex items-center justify-between border-b border-school-line px-4 py-3">
                  <span className="font-display text-sm font-bold text-school-ink">
                    Notifications
                  </span>
                  {unread > 0 ? (
                    <button
                      type="button"
                      onClick={() => markAll.mutate()}
                      disabled={markAll.isPending}
                      className="text-xs font-bold text-school-grape hover:underline disabled:opacity-50"
                    >
                      Tout marquer comme lu
                    </button>
                  ) : null}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifLoading ? (
                    <p className="px-4 py-6 text-center text-sm text-school-inkmuted">
                      Chargement…
                    </p>
                  ) : !notifList?.items.length ? (
                    <p className="px-4 py-8 text-center text-sm text-school-inkmuted">
                      Aucune notification.
                    </p>
                  ) : (
                    <ul>
                      {notifList.items.map((n) => {
                        const isUnread = !n.read_at
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => { if (isUnread) markRead.mutate(n.id) }}
                              className={[
                                'flex w-full gap-2.5 border-b border-school-line/60 px-4 py-3 text-left transition hover:bg-school-mist/30',
                                isUnread ? 'bg-school-mist/40' : '',
                              ].join(' ')}
                            >
                              <span
                                className={[
                                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                  isUnread ? 'bg-school-coral' : 'bg-transparent',
                                ].join(' ')}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1">
                                <span className={[
                                  'block text-sm leading-snug text-school-ink',
                                  isUnread ? 'font-bold' : 'font-medium',
                                ].join(' ')}>
                                  {n.title}
                                </span>
                                {n.body ? (
                                  <span className="mt-0.5 block text-xs leading-snug text-school-inkmuted">
                                    {n.body}
                                  </span>
                                ) : null}
                                <span className="mt-1 block text-[11px] font-medium text-school-inkmuted">
                                  {timeAgo(n.created_at)}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <Link
                  to="/communications/notifications"
                  onClick={() => setOpenNotif(false)}
                  className="block border-t border-school-line px-4 py-3 text-center text-xs font-bold text-school-grape hover:bg-school-mist/30"
                >
                  Voir toutes les notifications
                </Link>
              </div>
            ) : null}
          </div>
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
