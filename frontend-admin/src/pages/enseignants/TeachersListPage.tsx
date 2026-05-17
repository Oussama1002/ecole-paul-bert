import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as teachersApi from '../../api/teachers'
import { ErrorState } from '../../components/ui/ErrorState'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { TeacherFormModal } from './TeacherFormModal'

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  suspended: 'Suspendu',
  left: 'Parti',
}

const statusPill: Record<string, string> = {
  active: 'school-pill-green',
  inactive: 'school-pill-muted',
  suspended: 'school-pill-coral',
  left: 'school-pill-muted',
}

const employmentLabels: Record<string, string> = {
  full_time: 'Temps plein',
  part_time: 'Temps partiel',
  contract: 'Contrat',
  temporary: 'Intérim',
}

export function TeachersListPage() {
  const { hasPermission } = useAuth()
  const { simpleMode } = useSimpleMode()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [modalTeacher, setModalTeacher] = useState<number | 'new' | null>(null)

  const canManage = hasPermission('teachers.manage')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teachers', page, debounced, status, employmentType],
    queryFn: () =>
      teachersApi.fetchTeachers({
        page,
        per_page: 25,
        search: debounced || undefined,
        status: status || undefined,
        employment_type: employmentType || undefined,
        sort_by: 'last_name',
        sort_order: 'asc',
      }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => teachersApi.deleteTeacher(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setDebounced(search.trim())
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        emoji="👩‍🏫"
        title="Enseignants"
        subtitle={
          simpleMode
            ? "Liste de l'équipe enseignante."
            : 'Liste avec filtres avancés et gestion fine du personnel.'
        }
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setModalTeacher('new')}
              className="school-btn-primary"
            >
              + Nouvel enseignant
            </button>
          ) : null
        }
      />

      {simpleMode ? (
        <form
          onSubmit={applySearch}
          className="school-section mb-4 flex flex-wrap items-end gap-3"
        >
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Rechercher un enseignant
            </span>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base"
              >
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom ou prénom…"
                className="school-input pl-10"
              />
            </div>
          </label>
          <button type="submit" className="school-btn-primary">
            Rechercher
          </button>
        </form>
      ) : (
        <form
          onSubmit={applySearch}
          className="school-section mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
        >
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Recherche
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, prénom, matricule…"
              className="school-input"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Statut
            </span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="school-select"
            >
              <option value="">Tous</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Type de contrat
            </span>
            <select
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value)
                setPage(1)
              }}
              className="school-select"
            >
              <option value="">Tous</option>
              {Object.entries(employmentLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="school-btn-secondary">
              Rechercher
            </button>
          </div>
        </form>
      )}

      {isLoading && <LoadingState label="Chargement des enseignants…" />}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger la liste des enseignants."
          onRetry={() => void refetch()}
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          emoji="👩‍🏫"
          title="Aucun enseignant à afficher"
          hint={
            simpleMode
              ? 'Aucun enseignant ne correspond à votre recherche.'
              : 'Aucun résultat avec ces filtres. Modifiez les critères ou ajoutez un nouvel enseignant.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
                Réessayer
              </button>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setModalTeacher('new')}
                  className="school-btn-primary"
                >
                  + Nouvel enseignant
                </button>
              ) : null}
            </div>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <div className="school-table-wrap">
          <table className="school-table">
            <thead>
              <tr>
                {!simpleMode && <th>Matricule</th>}
                <th>Enseignant</th>
                {!simpleMode && (
                  <>
                    <th>Statut</th>
                    <th>Contrat</th>
                  </>
                )}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  {!simpleMode && (
                    <td className="font-mono text-xs text-school-inkmuted">
                      {t.employee_code}
                    </td>
                  )}
                  <td>
                    <Link
                      to={`/enseignants/${t.id}`}
                      className="flex items-center gap-3 font-semibold text-school-ink hover:text-school-grape"
                    >
                      <StudentAvatar
                        firstName={t.first_name}
                        lastName={t.last_name}
                        seed={`t-${t.id}`}
                      />
                      <span className="flex flex-col">
                        <span className="leading-tight">
                          {t.last_name} {t.first_name}
                        </span>
                        {simpleMode && t.email ? (
                          <span className="text-[11px] font-normal text-school-inkmuted">
                            {t.email}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  {!simpleMode && (
                    <>
                      <td>
                        <span className={statusPill[t.status] ?? 'school-pill-muted'}>
                          {statusLabels[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="text-school-inkmuted">
                        {employmentLabels[t.employment_type] ?? t.employment_type}
                      </td>
                    </>
                  )}
                  <td className="text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-3">
                      <Link
                        to={`/enseignants/${t.id}`}
                        className="text-xs font-bold text-school-grape hover:underline"
                      >
                        Fiche
                      </Link>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setModalTeacher(t.id)}
                          className="text-xs font-bold text-school-skydeep hover:underline"
                        >
                          Modifier
                        </button>
                      )}
                      {canManage && !simpleMode && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                'Supprimer cet enseignant ? Les affectations associées seront supprimées.'
                              )
                            ) {
                              remove.mutate(t.id)
                            }
                          }}
                          className="text-xs font-bold text-[#B23A2E] hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t-2 border-school-line px-4 py-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-sm font-bold text-school-grape disabled:opacity-40"
              >
                ← Précédent
              </button>
              <span className="text-xs font-semibold text-school-inkmuted">
                Page {data.meta.current_page} / {data.meta.last_page}
              </span>
              <button
                type="button"
                disabled={page >= data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm font-bold text-school-grape disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      {modalTeacher !== null && (
        <TeacherFormModal
          teacherId={modalTeacher === 'new' ? null : modalTeacher}
          onClose={() => setModalTeacher(null)}
        />
      )}
    </div>
  )
}
