import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AppFooter } from '../components/layout/AppFooter'
import { AppHeader } from '../components/layout/AppHeader'
import { AppSidebar } from '../components/layout/AppSidebar'
import { SimpleSidebar } from '../components/layout/SimpleSidebar'
import { TeacherSidebar } from '../components/layout/TeacherSidebar'
import { useAuth } from '../contexts/AuthContext'
import { useSimpleMode } from '../contexts/SimpleModeContext'
import { useCurrentSchoolYear } from '../hooks/useCurrentSchoolYear'
import { isTeacherRole } from '../utils/roles'

function NoSchoolYearBanner() {
  const { simpleMode } = useSimpleMode()
  const { hasPermission } = useAuth()
  const { isLoading, hasCurrentYear } = useCurrentSchoolYear()

  if (isLoading || hasCurrentYear) return null
  if (!hasPermission('school_years.manage') && !hasPermission('school_years.view')) {
    return null
  }

  const configPath = simpleMode ? '/ecole/parametres' : '/parametrage/annees-scolaires'

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <span className="text-base">⚠️</span>
      <span className="font-semibold">
        Aucune année scolaire active.{' '}
        <Link to={configPath} className="underline hover:text-amber-700">
          Configurer une année scolaire
        </Link>{' '}
        pour pouvoir enregistrer des présences, notes et paiements.
      </span>
    </div>
  )
}

export function AdminLayout() {
  const { simpleMode } = useSimpleMode()
  const { user } = useAuth()
  const isTeacher = isTeacherRole(user?.role?.code)
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const sidebar = isTeacher ? <TeacherSidebar /> : simpleMode ? <SimpleSidebar /> : <AppSidebar />

  return (
    <div className="school-page-bg flex min-h-screen font-sans text-school-ink">
      {/* Desktop sidebar (static, inline) */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* Mobile sidebar (slide-out drawer) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer panel */}
        <div
          className={`absolute inset-y-0 left-0 max-w-[85vw] transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            className="absolute right-2 top-2 z-10 rounded-full bg-white/20 px-2 py-1 text-lg text-white backdrop-blur hover:bg-white/40"
          >
            ✕
          </button>
          {sidebar}
        </div>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader onMenuClick={() => setMobileOpen(true)} />
        <NoSchoolYearBanner />
        <main className="flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
          <div className="school-main-surface flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
