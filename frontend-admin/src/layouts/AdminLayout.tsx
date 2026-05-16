import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useLocation } from 'react-router-dom'
import * as schoolYearsApi from '../api/schoolYears'
import { AppFooter } from '../components/layout/AppFooter'
import { AppHeader } from '../components/layout/AppHeader'
import { AppSidebar } from '../components/layout/AppSidebar'
import { SimpleSidebar } from '../components/layout/SimpleSidebar'
import { useSimpleMode } from '../contexts/SimpleModeContext'

function NoSchoolYearBanner() {
  const { simpleMode } = useSimpleMode()
  const { data, isLoading } = useQuery({
    queryKey: ['school-year-guard'],
    queryFn: () => schoolYearsApi.fetchSchoolYears({ per_page: 5, is_current: true }),
    staleTime: 2 * 60 * 1000,
  })

  if (isLoading) return null
  const hasCurrent = data?.items.some((y) => y.is_current)
  if (hasCurrent) return null

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="school-page-bg flex min-h-screen font-sans text-school-ink">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}
      {simpleMode ? (
        <SimpleSidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      ) : (
        <AppSidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      )}
      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <AppHeader onMenuToggle={() => setMobileNavOpen((v) => !v)} />
        <NoSchoolYearBanner />
        <main className="flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
          <div className="school-main-surface flex min-h-0 flex-1 flex-col p-4 sm:p-8">
            <Outlet />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
