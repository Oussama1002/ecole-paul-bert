import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as announcementsApi from '../../api/announcements'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { AnnouncementFormModal } from './AnnouncementFormModal'

function formatAnnouncementDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function AnnouncementsListPage() {
  const { hasPermission } = useAuth()
  const { simpleMode } = useSimpleMode()
  const qc = useQueryClient()
  const canManage = hasPermission('announcements.manage')
  const [modalAnnouncement, setModalAnnouncement] = useState<number | 'new' | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['announcements', canManage ? 'all' : 'published'],
    queryFn: () =>
      announcementsApi.fetchAnnouncements({
        per_page: 50,
        ...(canManage ? {} : { status: 'published' }),
      }),
  })

  const publishMut = useMutation({
    mutationFn: announcementsApi.publishAnnouncement,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const archiveMut = useMutation({
    mutationFn: announcementsApi.archiveAnnouncement,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const deleteMut = useMutation({
    mutationFn: announcementsApi.deleteAnnouncement,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  if (!canManage) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-school-ink">Annonces publiées</h2>
        {isLoading && <LoadingState label="Chargement des annonces…" lines={3} />}
        {error && (
          <ErrorState error={error} fallback="Impossible de charger les annonces." />
        )}
        {!isLoading && !error && (
          <div className="space-y-3">
            {data?.items.map((a) => (
              <article
                key={a.id}
                className="rounded-2xl border-2 border-school-line bg-white p-5 shadow-sm"
              >
                <h3 className="font-display text-lg font-bold text-school-ink">{a.title}</h3>
                {(a.start_date || a.created_at) && (
                  <p className="mt-1 text-xs font-medium text-school-inkmuted">
                    {a.start_date
                      ? `Du ${formatAnnouncementDate(a.start_date)}`
                      : formatAnnouncementDate(a.created_at)}
                    {a.end_date ? ` au ${formatAnnouncementDate(a.end_date)}` : ''}
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-school-ink">
                  {a.content}
                </p>
              </article>
            ))}
            {!data?.items.length ? (
              <EmptyState
                emoji="📢"
                title="Aucune annonce publiée"
                hint="Les annonces de l'établissement apparaîtront ici une fois publiées par la direction."
              />
            ) : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">Annonces</h2>
        <button
          type="button"
          onClick={() => setModalAnnouncement('new')}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Nouvelle annonce
        </button>
      </div>
      {isLoading && <LoadingState label="Chargement des annonces…" lines={3} />}
      {error && <ErrorState error={error} fallback="Impossible de charger les annonces." />}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Titre</th>
              {!simpleMode && <th className="px-4 py-2">Public</th>}
              {!simpleMode && <th className="px-4 py-2">Statut</th>}
              {!simpleMode && <th className="px-4 py-2">Période</th>}
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">{a.title}</td>
                {!simpleMode && (
                  <td className="px-4 py-2 text-slate-600">{a.audience_type}</td>
                )}
                {!simpleMode && (
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                      {a.status}
                    </span>
                  </td>
                )}
                {!simpleMode && (
                  <td className="px-4 py-2 text-slate-600">
                    {a.start_date ?? '—'} → {a.end_date ?? '—'}
                  </td>
                )}
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setModalAnnouncement(a.id)}
                      className="text-indigo-600 hover:underline"
                    >
                      Modifier
                    </button>
                    {!simpleMode && a.status !== 'published' ? (
                      <button
                        type="button"
                        className="text-emerald-600 hover:underline"
                        onClick={() => void publishMut.mutateAsync(a.id)}
                      >
                        Publier
                      </button>
                    ) : null}
                    {!simpleMode && a.status !== 'archived' ? (
                      <button
                        type="button"
                        className="text-amber-700 hover:underline"
                        onClick={() => void archiveMut.mutateAsync(a.id)}
                      >
                        Archiver
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Supprimer définitivement cette annonce ?'
                          )
                        ) {
                          void deleteMut.mutateAsync(a.id)
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !error && !data?.items.length ? (
          <EmptyState
            emoji="📢"
            title="Aucune annonce"
            hint="Créez votre première annonce pour informer élèves, parents et enseignants."
            action={
              <button
                type="button"
                onClick={() => setModalAnnouncement('new')}
                className="school-btn-primary"
              >
                Créer une annonce
              </button>
            }
          />
        ) : null}
      </div>

      {modalAnnouncement !== null && (
        <AnnouncementFormModal
          announcementId={modalAnnouncement === 'new' ? null : modalAnnouncement}
          onClose={() => setModalAnnouncement(null)}
        />
      )}
    </div>
  )
}
