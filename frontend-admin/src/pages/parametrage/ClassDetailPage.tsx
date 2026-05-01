import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as classesApi from '../../api/classes'
import { useAuth } from '../../contexts/AuthContext'

export function ClassDetailPage() {
  const { id } = useParams()
  const numericId = id ? parseInt(id, 10) : NaN
  const { hasPermission } = useAuth()
  const canManage = hasPermission('classes.manage')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['class', numericId],
    queryFn: () => classesApi.fetchClass(numericId),
    enabled: !Number.isNaN(numericId),
  })

  if (Number.isNaN(numericId)) {
    return <p className="text-sm text-red-600">Identifiant invalide.</p>
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }
  if (isError) {
    return <p className="text-sm text-red-600">{(error as Error).message}</p>
  }
  if (!data) return null

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/parametrage/classes"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Classes
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {data.name}{' '}
            <span className="font-mono text-base font-normal text-slate-500">
              ({data.code})
            </span>
          </h2>
          {canManage && (
            <Link
              to={`/parametrage/classes/${data.id}/editer`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Modifier
            </Link>
          )}
        </div>
      </div>

      <dl className="max-w-xl space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <dt className="text-xs uppercase text-slate-500">Niveau</dt>
          <dd className="text-slate-800">{data.level?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Année scolaire</dt>
          <dd className="text-slate-800">{data.school_year?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Section</dt>
          <dd className="text-slate-800">{data.section ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Effectif max</dt>
          <dd className="text-slate-800">{data.max_students ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Salle (libellé)</dt>
          <dd className="text-slate-800">{data.room_label ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">
            Enseignant principal
          </dt>
          <dd className="text-slate-800">
            {data.main_teacher
              ? `${data.main_teacher.first_name} ${data.main_teacher.last_name} (${data.main_teacher.employee_code})`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Statut</dt>
          <dd className="text-slate-800">{data.status}</dd>
        </div>
      </dl>
    </div>
  )
}
