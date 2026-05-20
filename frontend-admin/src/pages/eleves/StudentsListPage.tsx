import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as classesApi from '../../api/classes'
import * as levelsApi from '../../api/levels'
import * as schoolYearsApi from '../../api/schoolYears'
import * as studentsApi from '../../api/students'
import { ErrorState } from '../../components/ui/ErrorState'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StudentAvatar } from '../../components/ui/StudentAvatar'
import { getApiErrorMessage } from '../../utils/apiError'
import { QuickStudentForm } from './QuickStudentForm'
import { StudentEditModal } from './StudentEditModal'

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  transferred: 'Transféré',
  graduated: 'Diplômé',
  suspended: 'Suspendu',
  withdrawn: 'Retiré',
}

const statusPillClass: Record<string, string> = {
  pending: 'school-pill-sun',
  active: 'school-pill-green',
  transferred: 'school-pill-sky',
  graduated: 'school-pill-grape',
  suspended: 'school-pill-coral',
  withdrawn: 'school-pill-muted',
}

export function StudentsListPage() {
  const { hasPermission } = useAuth()
  const { simpleMode } = useSimpleMode()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [schoolYearId, setSchoolYearId] = useState<number | ''>('')
  const [levelId, setLevelId] = useState<number | ''>('')
  const [classId, setClassId] = useState<number | ''>('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editStudentId, setEditStudentId] = useState<number | null>(null)

  const canManage = hasPermission('students.manage')
  const canExport = hasPermission('students.export')
  const canImport = hasPermission('students.import')

  const { data: years } = useQuery({
    queryKey: ['school-years-all'],
    queryFn: () =>
      schoolYearsApi.fetchSchoolYears({
        per_page: 100,
        sort_by: 'start_date',
        sort_order: 'desc',
      }),
  })

  useEffect(() => {
    if (!years?.items.length || schoolYearId !== '') return
    const current = years.items.find((y) => y.is_current) ?? years.items[0]
    setSchoolYearId(current.id)
  }, [years, schoolYearId])

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () =>
      levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes-filter', schoolYearId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 100,
        school_year_id: schoolYearId === '' ? undefined : schoolYearId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
    enabled: schoolYearId !== '',
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'students',
      page,
      debounced,
      status,
      schoolYearId,
      levelId,
      classId,
    ],
    queryFn: () =>
      studentsApi.fetchStudents({
        page,
        per_page: 25,
        search: debounced || undefined,
        status: status || undefined,
        school_year_id: schoolYearId === '' ? undefined : schoolYearId,
        level_id: levelId === '' ? undefined : levelId,
        class_id: classId === '' ? undefined : classId,
        sort_by: 'last_name',
        sort_order: 'asc',
      }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => studentsApi.deleteStudent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  })

  const exportParams = {
    search: debounced || undefined,
    status: status || undefined,
    school_year_id: schoolYearId === '' ? undefined : schoolYearId,
    level_id: levelId === '' ? undefined : levelId,
    class_id: classId === '' ? undefined : classId,
  }

  const doExportExcel = useMutation({
    mutationFn: () => studentsApi.downloadStudentsExportExcel(exportParams),
  })

  const doImport = useMutation({
    mutationFn: (file: File) => studentsApi.importStudents(file),
    onSuccess: (r) => {
      setImportMsg(
        `Créés : ${r.created}, ignorés : ${r.skipped}, erreurs : ${r.errors.length}`
      )
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (e) => setImportMsg(getApiErrorMessage(e, "Import d'élèves impossible.")),
  })

  function applySearch(e: React.FormEvent) {
    e.preventDefault()
    setDebounced(search.trim())
    setPage(1)
  }

  return (
    <div>
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-school-line px-6 py-4">
              <h2 className="font-display text-xl font-bold text-school-ink">Nouvel élève</h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-xl border-2 border-school-line px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
              >
                ✕ Fermer
              </button>
            </div>
            <div className="p-6">
              <QuickStudentForm onClose={() => setShowNewModal(false)} />
            </div>
          </div>
        </div>
      )}

      <PageHeader
        emoji="🎒"
        title="Élèves"
        subtitle={
          simpleMode
            ? 'Recherchez un élève ou ajoutez-en un nouveau.'
            : 'Liste complète des élèves avec filtres et import / export.'
        }
        actions={
          <>
            {!simpleMode && canImport && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      doImport.mutate(f)
                      e.target.value = ''
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={doImport.isPending}
                  className="school-btn-secondary"
                >
                  Importer CSV / Excel
                </button>
              </>
            )}
            {canExport && (
              <button
                type="button"
                onClick={() => doExportExcel.mutate()}
                disabled={doExportExcel.isPending}
                className="school-btn-secondary"
              >
                {doExportExcel.isPending ? 'Export…' : 'Exporter Excel'}
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="school-btn-primary"
              >
                + Nouvel élève
              </button>
            )}
          </>
        }
      />

      {importMsg && (
        <p className="mb-4 rounded-2xl border-2 border-school-sun/40 bg-school-sunsoft/50 px-4 py-2.5 text-sm font-semibold text-amber-900">
          {importMsg}
        </p>
      )}

      {simpleMode ? (
        <form onSubmit={applySearch} className="school-section mb-4 space-y-3">
          <SectionTitle
            emoji="🔎"
            title="Recherche rapide"
            hint="Tapez un nom, prénom ou code élève."
            iconClassName="bg-school-mist text-school-skydeep"
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[240px] flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                Élève
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
                  placeholder="Nom, prénom ou code…"
                  className="school-input pl-10"
                />
              </div>
            </label>
            <button type="submit" className="school-btn-primary">
              Rechercher
            </button>
          </div>
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
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, nom, prénom…"
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
              Année scolaire
            </span>
            <select
              value={schoolYearId === '' ? '' : schoolYearId}
              onChange={(e) => {
                setSchoolYearId(e.target.value === '' ? '' : Number(e.target.value))
                setClassId('')
                setPage(1)
              }}
              className="school-select"
            >
              <option value="">Toutes</option>
              {years?.items.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Niveau
            </span>
            <select
              value={levelId === '' ? '' : levelId}
              onChange={(e) => {
                setLevelId(e.target.value === '' ? '' : Number(e.target.value))
                setPage(1)
              }}
              className="school-select"
            >
              <option value="">Tous</option>
              {levels?.items.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Classe
            </span>
            <select
              value={classId === '' ? '' : classId}
              onChange={(e) => {
                setClassId(e.target.value === '' ? '' : Number(e.target.value))
                setPage(1)
              }}
              className="school-select"
            >
              <option value="">Toutes</option>
              {classes?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
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

      {isLoading && <LoadingState label="Chargement des élèves…" />}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger la liste des élèves."
          onRetry={() => void refetch()}
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          emoji="🎒"
          title="Aucun élève à afficher"
          hint={
            simpleMode
              ? 'Aucun élève ne correspond à votre recherche. Essayez un autre nom ou ajoutez un nouvel élève.'
              : 'Aucun résultat avec ces filtres. Modifiez les critères ou créez un nouvel élève.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
                Réessayer
              </button>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setShowNewModal(true)}
                  className="school-btn-primary"
                >
                  + Nouvel élève
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
                {!simpleMode && <th>Code</th>}
                <th>Élève</th>
                {!simpleMode && <th>Statut</th>}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  {!simpleMode && (
                    <td className="font-mono text-xs text-school-inkmuted">
                      {s.student_code}
                    </td>
                  )}
                  <td>
                    <Link
                      to={`/eleves/${s.id}`}
                      className="flex items-center gap-3 font-semibold text-school-ink hover:text-school-grape"
                    >
                      <StudentAvatar
                        firstName={s.first_name}
                        lastName={s.last_name}
                        seed={s.id}
                      />
                      <span className="flex flex-col">
                        <span className="leading-tight">
                          {s.last_name} {s.first_name}
                        </span>
                        {simpleMode && (
                          <span className="text-[11px] font-normal text-school-inkmuted">
                            {s.student_code}
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  {!simpleMode && (
                    <td>
                      <span className={statusPillClass[s.status] ?? 'school-pill-muted'}>
                        {statusLabels[s.status] ?? s.status}
                      </span>
                    </td>
                  )}
                  <td className="text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-3">
                      <Link
                        to={`/eleves/${s.id}`}
                        className="text-xs font-bold text-school-grape hover:underline"
                      >
                        Fiche
                      </Link>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditStudentId(s.id)}
                            className="text-xs font-bold text-school-skydeep hover:underline"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Archiver cet élève (suppression logique) ?'
                                )
                              ) {
                                remove.mutate(s.id)
                              }
                            }}
                            className="text-xs font-bold text-[#B23A2E] hover:underline"
                          >
                            Archiver
                          </button>
                        </>
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

      {editStudentId !== null && (
        <StudentEditModal
          studentId={editStudentId}
          onClose={() => setEditStudentId(null)}
        />
      )}
    </div>
  )
}
