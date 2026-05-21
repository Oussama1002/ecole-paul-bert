import { Navigate, useParams } from 'react-router-dom'

/** Opens the years list with ?edit=id so the edit modal is shown (no full page). */
export function SchoolYearEditRedirect() {
  const { id } = useParams()
  return <Navigate to={`/parametrage/annees-scolaires?edit=${id ?? ''}`} replace />
}
