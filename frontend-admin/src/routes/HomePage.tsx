import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DashboardPage } from '../pages/DashboardPage'
import { isTeacherRole } from '../utils/roles'

export function HomePage() {
  const { user } = useAuth()

  if (isTeacherRole(user?.role?.code)) {
    return <Navigate to="/emploi-du-temps" replace />
  }

  return <DashboardPage />
}
