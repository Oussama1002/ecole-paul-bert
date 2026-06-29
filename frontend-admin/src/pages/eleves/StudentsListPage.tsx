import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
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
  archived: 'Archivé',
}

const statusPillClass: Record<string, string> = {
  pending: 'school-pill-sun',
  active: 'school-pill-green',
  transferred: 'school-pill-sky',
  graduated: 'school-pill-grape',
  suspended: 'school-pill-coral',
  withdrawn: 'school-pill-muted',
  archived: 'school-pill-muted',
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

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () =>
      levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes-filter', levelId],
    queryFn: () =>
      classesApi.fetchClasses({
        per_page: 200,
        level_id: levelId === '' ? undefined : levelId,
        sort_by: 'name',
        sort_order: 'asc',
      }),
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

  const archive = useMutation({
    mutationFn: (id: number) => studentsApi.updateStudent(id, { status: 'archived' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  })

  const forceDelete = useMutation({
    mutationFn: (id: number) => studentsApi.forceDeleteStudent(id),
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

  const hasActiveFilters =
    !!debounced || !!status || schoolYearId !== '' || levelId !== '' || classId !== ''

  function resetFilters() {
    setSearch('')
    setDebounced('')
    setStatus('')
    setSchoolYearId('')
    setLevelId('')
    setClassId('')
    setPage(1)
  }

  const activeOnPage = data?.items.filter((s) => s.status === 'active').length ?? 0
  const pendingOnPage = data?.items.filter((s) => s.status === 'pending').length ?? 0

  const selectedYearName =
    schoolYearId !== '' ? years?.items.find((y) => y.id === schoolYearId)?.name : null
  const selectedClassName =
    classId !== '' ? classes?.items.find((c) => c.id === classId)?.name : null

  return (
    <div className="space-y-5">
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8 sm:pt-12"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewModal(false)
          }}
        >
          <div className="w-full max-w-2xl rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b-2 border-school-line bg-gradient-to-r from-school-sky/10 via-school-grape/10 to-school-bubblegum/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  🎒
                </span>
                <h2 className="font-display text-xl font-bold text-school-ink">Nouvel élève</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-xl border-2 border-school-line bg-white px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream"
              >
                ✕
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
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="school-btn-secondary"
            >
              {isLoading ? 'Actualisation…' : '↻ Actualiser'}
            </button>
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

      {/* Hero */}
      <div className="school-hero !from-school-skydeep !via-school-grape !to-school-bubblegum">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Effectif scolaire
            </p>
            <p className="mt-1 font-display text-xl font-bold sm:text-2xl">
              {data ? `${data.meta.total} élève(s)` : 'Liste des élèves'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedYearName && (
                <span className="school-chip-on-dark">{selectedYearName}</span>
              )}
              {selectedClassName && (
                <span className="school-chip-on-dark">🏫 {selectedClassName}</span>
              )}
              {status && (
                <span className="school-chip-on-dark">
                  {statusLabels[status] ?? status}
                </span>
              )}
              {debounced && (
                <span className="school-chip-on-dark">🔍 « {debounced} »</span>
              )}
            </div>
          </div>
          {data && (
            <div className="rounded-2xl border border-white/30 bg-white/15 px-4 py-3 text-center backdrop-blur">
              <p className="font-display text-3xl font-bold">{data.meta.total}</p>
              <p className="text-xs font-semibold text-white/80">résultat(s)</p>
            </div>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      {data && data.meta.total > 0 && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="school-tile school-accent-blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Total
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-ink">
                  {data.meta.total}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-sky/15 text-2xl">
                🎒
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Actifs (page)
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-school-leafdeep">
                  {activeOnPage}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-leaf/15 text-2xl">
                ✅
              </div>
            </div>
          </div>
          <div className="school-tile school-accent-yellow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  En attente (page)
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-[#92400E]">
                  {pendingOnPage}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-school-sun/25 text-2xl">
                ⏳
              </div>
            </div>
          </div>
        </section>
      )}

      {importMsg && (
        <p className="rounded-2xl border-2 border-school-sun/40 bg-school-sunsoft/50 px-4 py-2.5 text-sm font-semibold text-amber-900">
          {importMsg}
        </p>
      )}

      {simpleMode ? (
        <form onSubmit={applySearch} className="school-section space-y-3">
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
        <form onSubmit={applySearch} className="school-section space-y-3">
          <SectionTitle
            emoji="🔎"
            title="Filtres"
            hint="Affinez la liste par recherche, statut, année, niveau ou classe."
            iconClassName="bg-school-mist text-school-skydeep"
            actions={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="school-btn-secondary !py-1.5 !text-xs"
                >
                  Réinitialiser
                </button>
              ) : null
            }
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
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
              <option value="">Toutes les années</option>
              {years?.items.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.is_current ? ' (courante)' : ''}
                </option>
              ))}
            </select>
            {schoolYearId !== '' && (
              <span className="mt-1 block text-xs text-school-inkmuted">
                Filtre actif : élèves inscrits pour cette année (ou sans inscription).
              </span>
            )}
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
              <option value="">
                {classesLoading ? 'Chargement…' : 'Toutes'}
              </option>
              {(classes?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                  {classesApi.classYearLabel(c) !== 'Toutes les années'
                    ? ` — ${classesApi.classYearLabel(c)}`
                    : ''}
                </option>
              ))}
            </select>
            {!classesLoading && (classes?.items.length ?? 0) === 0 && (
              <span className="mt-1 block text-xs text-amber-700">
                Aucune classe — créez-en dans Paramétrage → Classes.
              </span>
            )}
          </label>
          <div className="flex items-end md:col-span-2 lg:col-span-1">
            <button type="submit" className="school-btn-primary w-full sm:w-auto">
              Rechercher
            </button>
          </div>
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
        <section className="school-section !p-0 overflow-hidden">
          <div className="border-b-2 border-school-line px-4 py-4 sm:px-5">
            <SectionTitle
              emoji="📋"
              title="Liste des élèves"
              hint={`${data.meta.total} résultat(s) · page ${data.meta.current_page} / ${data.meta.last_page}`}
              iconClassName="bg-school-sky/20 text-school-skydeep"
            />
          </div>
        <div className="school-table-wrap !rounded-none !border-0">
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
                          {s.status !== 'archived' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Archiver cet élève ? Il reste dans la base mais n’apparaît plus dans la liste par défaut."
                                  )
                                ) {
                                  archive.mutate(s.id)
                                }
                              }}
                              className="text-xs font-bold text-amber-700 hover:underline"
                            >
                              Archiver
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Supprimer définitivement ${s.first_name} ${s.last_name} ? Cette action est irréversible.`
                                  )
                                ) {
                                  forceDelete.mutate(s.id)
                                }
                              }}
                              className="text-xs font-bold text-[#B23A2E] hover:underline"
                            >
                              Supprimer définitivement
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.meta.last_page > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-school-line bg-school-cream/30 px-4 py-3 sm:px-5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="school-btn-secondary !py-1.5 !text-xs disabled:opacity-40"
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
                className="school-btn-secondary !py-1.5 !text-xs disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
        </section>
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
