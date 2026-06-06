import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function AnnouncementFormModal({
  announcementId,
  onClose,
}: {
  announcementId: number | null
  onClose: () => void
}) {
  const isEdit = announcementId !== null
  const qc = useQueryClient()
  const { simpleMode } = useSimpleMode()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['announcement', announcementId],
    queryFn: () => announcementsApi.fetchAnnouncement(announcementId as number),
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
        return announcementsApi.updateAnnouncement(announcementId as number, payload)
      }
      return announcementsApi.createAnnouncement(payload)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['announcements'] })
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isEdit ? "Modifier l'annonce" : 'Nouvelle annonce'}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        {isEdit && isLoading ? (
          <p className="p-6 text-sm text-school-inkmuted">Chargement…</p>
        ) : (
          <form
            className="space-y-4 p-6"
            onSubmit={(e) => { e.preventDefault(); void saveMut.mutateAsync() }}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Titre *</span>
              <input
                required
                className="school-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Contenu *</span>
              <textarea
                required
                rows={8}
                className="school-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </label>

            {!simpleMode && (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Destinataires</span>
                  <select
                    className="school-select"
                    value={audienceType}
                    onChange={(e) =>
                      setAudienceType(e.target.value as (typeof AUDIENCES)[number]['value'])
                    }
                  >
                    {AUDIENCES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                {audienceType === 'class_specific' ? (
                  <ClassPicker value={classId} onChange={setClassId} />
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Début affichage</span>
                    <input
                      type="date"
                      className="school-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Fin affichage</span>
                    <input
                      type="date"
                      className="school-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Statut</span>
                  <select
                    className="school-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </label>
              </>
            )}
            {simpleMode && (
              <label className="flex items-center gap-2 text-sm text-school-ink">
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
              <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
                {(saveMut.error as Error).message}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button
                type="submit"
                disabled={saveMut.isPending}
                className="school-btn-primary disabled:opacity-60"
              >
                {saveMut.isPending ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : "Créer l'annonce"}
              </button>
            </div>
          </form>
        )}
      </div>
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
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Classe</span>
      <SearchSelect
        value={value}
        onChange={onChange}
        options={options}
        isLoading={q.isLoading}
        isError={q.isError}
        placeholder="Rechercher une classe…"
      />
    </label>
  )
}
