import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { ClassFormModal } from './ClassFormModal'

export function ClassFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isNew = !!matchPath('/parametrage/classes/nouveau', pathname)
  const editMatch = matchPath('/parametrage/classes/:id/editer', pathname)
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  return (
    <ClassFormModal
      classId={isNew || Number.isNaN(id) ? null : id}
      onClose={() => navigate('/parametrage/classes')}
    />
  )
}
