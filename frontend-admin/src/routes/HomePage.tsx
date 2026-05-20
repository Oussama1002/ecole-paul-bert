import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSimpleMode } from '../contexts/SimpleModeContext'
import { DashboardPage } from '../pages/DashboardPage'
import { SimpleDashboardPage } from '../pages/SimpleDashboardPage'
import { isTeacherRole } from '../utils/roles'

export function HomePage() {
  const { user } = useAuth()
  const { simpleMode } = useSimpleMode()

  if (isTeacherRole(user?.role?.code)) {
    return <Navigate to="/emploi-du-temps" replace />
  }

  return simpleMode ? <SimpleDashboardPage /> : <DashboardPage />
}
