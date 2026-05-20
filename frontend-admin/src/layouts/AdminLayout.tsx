import { Link, Outlet } from 'react-router-dom'
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

  return (
    <div className="school-page-bg flex min-h-screen font-sans text-school-ink">
      {isTeacher ? (
        <TeacherSidebar />
      ) : simpleMode ? (
        <SimpleSidebar />
      ) : (
        <AppSidebar />
      )}
      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader />
        <NoSchoolYearBanner />
        <main className="flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
          <div className="school-main-surface flex min-h-0 flex-1 flex-col p-5 sm:p-8">
            <Outlet />
          </div>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
