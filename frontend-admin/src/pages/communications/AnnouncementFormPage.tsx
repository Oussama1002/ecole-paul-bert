import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import * as announcementsApi from '../../api/announcements'
import * as classesApi from '../../api/classes'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useSimpleMode } from '../../contexts/SimpleModeContext'

const AUDIENCES = [
  { value: 'all', label: 'Tout le monde' },
  { value: 'students', label: 'Élèves' },
  { value: 'teachers', label: 'Enseignants' },
  { value: 'staff', label: 'Personnel' },
  { value: 'parents', label: 'Parents' },
  { value: 'class_specific', label: 'Une classe' },
] as const

export function AnnouncementFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { simpleMode } = useSimpleMode()
  const isEdit = Boolean(id && id !== 'nouveau')

  const { data: existing } = useQuery({
    queryKey: ['announcement', id],
    queryFn: () => announcementsApi.fetchAnnouncement(Number(id)),
    enabled: isEdit,
  })

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audienceType, setAudienceType] =
    useState<(typeof AUDIENCES)[number]['value']>('all')
  const [classId, setClassId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    simpleMode ? 'published' : 'draft'
  )
  const [publishNow, setPublishNow] = useState(true)

  useEffect(() => {
    if (!existing) return
    setTitle(existing.title)
    setContent(existing.content)
    setAudienceType(existing.audience_type as (typeof AUDIENCES)[number]['value'])
    setClassId(existing.class_id ?? null)
    setStartDate(existing.start_date ?? '')
    setEndDate(existing.end_date ?? '')
    setStatus(existing.status as 'draft' | 'published' | 'archived')
  }, [existing])

  const saveMut = useMutation({
    mutationFn: async () => {
      const effectiveStatus = simpleMode
        ? publishNow
          ? ('published' as const)
          : ('draft' as const)
        : status
      const payload = {
        title,
        content,
        audience_type: simpleMode ? ('all' as const) : audienceType,
        class_id:
          !simpleMode && audienceType === 'class_specific' && classId
            ? classId
            : null,
        start_date: simpleMode ? null : startDate || null,
        end_date: simpleMode ? null : endDate || null,
        status: effectiveStatus,
      }
      if (isEdit) {
        return announcementsApi.updateAnnouncement(Number(id), payload)
      }
      return announcementsApi.createAnnouncement(payload)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['announcements'] })
      navigate('/communications/annonces')
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">
        {isEdit ? 'Modifier l’annonce' : 'Nouvelle annonce'}
      </h2>
      <form
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault()
          void saveMut.mutateAsync()
        }}
      >
        <label className="block text-sm">
          <span className="text-slate-600">Titre</span>
          <input
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Contenu</span>
          <textarea
            required
            rows={8}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        {!simpleMode && (
          <>
            <label className="block text-sm">
              <span className="text-slate-600">Public</span>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={audienceType}
                onChange={(e) =>
                  setAudienceType(
                    e.target.value as (typeof AUDIENCES)[number]['value']
                  )
                }
              >
                {AUDIENCES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {audienceType === 'class_specific' ? (
              <ClassPicker value={classId} onChange={setClassId} />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Début affichage</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Fin affichage</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-slate-600">Statut</span>
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'draft' | 'published' | 'archived')
                }
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
          </>
        )}
        {simpleMode && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publier immédiatement
          </label>
        )}
        {saveMut.isError ? (
          <p className="text-sm text-red-600">
            {(saveMut.error as Error).message}
          </p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
            onClick={() => navigate(-1)}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

function ClassPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  const q = useQuery({
    queryKey: ['classes-announcement-picker'],
    queryFn: () =>
      classesApi.fetchClasses({ per_page: 100, sort_by: 'name', sort_order: 'asc' }),
  })
  const options = useMemo(
    () =>
      (q.data?.items ?? []).map((c) => ({
        value: c.id,
        label: c.name,
        hint: c.code,
      })),
    [q.data?.items]
  )
  return (
    <label className="block text-sm">
      <span className="text-slate-600">Classe</span>
      <div className="mt-1">
        <SearchSelect
          value={value}
          onChange={onChange}
          options={options}
          isLoading={q.isLoading}
          isError={q.isError}
          placeholder="Rechercher une classe…"
        />
      </div>
    </label>
  )
}
