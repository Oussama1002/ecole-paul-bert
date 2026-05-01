import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import * as docsApi from '../../api/documents'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../../contexts/AuthContext'
import { useSimpleMode } from '../../contexts/SimpleModeContext'
import { getApiErrorMessage } from '../../utils/apiError'

const CATEGORIES = [
  { value: 'student', label: 'Élève' },
  { value: 'teacher', label: 'Enseignant' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin', label: 'Administration' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Autre' },
]

const DOC_TYPES = [
  { value: 'file', label: 'Fichier général' },
  { value: 'receipt', label: 'Reçu de paiement' },
  { value: 'invoice', label: 'Facture' },
  { value: 'contract', label: 'Contrat' },
  { value: 'certificate', label: 'Certificat / Attestation' },
  { value: 'report', label: 'Rapport' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Autre' },
]

export function DocumentsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const { simpleMode } = useSimpleMode()
  const canManage = hasPermission('documents.manage')

  const [category, setCategory] = useState('')
  const [type, setType] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMime, setPreviewMime] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['documents', category, type],
    queryFn: () =>
      docsApi.fetchDocuments({
        per_page: 100,
        category: category || undefined,
        document_type: type || undefined,
      }),
  })

  const upload = useMutation({
    mutationFn: async () => {
      setUploadError(null)
      if (!file) throw new Error('Sélectionnez un fichier.')
      await docsApi.uploadDocument({
        file,
        category: category || undefined,
        document_type: type || undefined,
        title: title || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      setFile(null)
      setTitle('')
      setUploadError(null)
    },
    onError: (e) => setUploadError(getApiErrorMessage(e, 'Upload impossible.')),
  })

  const openPreview = async (doc: docsApi.Document) => {
    setActionError(null)
    try {
      const blob = await docsApi.previewDocumentBlob(doc.id)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewMime(doc.mime_type ?? blob.type ?? null)
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) setActionError('Accès refusé : ce document est confidentiel.')
      else if (status === 404) setActionError('Document introuvable.')
      else setActionError('Aperçu impossible.')
    }
  }

  const handleDownload = async (id: number) => {
    setActionError(null)
    try {
      await docsApi.downloadDocument(id)
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Téléchargement impossible.'))
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewMime(null)
  }

  const items = useMemo(() => data?.items ?? [], [data?.items])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Documents</h2>
          <p className="text-sm text-slate-500">
            {simpleMode
              ? 'Ajoutez et téléchargez vos documents.'
              : 'Upload, filtres, preview simple, téléchargement, suppression.'}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className={`grid gap-3 rounded-lg border border-slate-200 bg-white p-4 ${simpleMode ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Catégorie</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Toutes</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Type de document</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Tous</option>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        {(category || type) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setCategory(''); setType('') }}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {canManage && (
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault()
            upload.mutate()
          }}
        >
          <div className="md:col-span-6">
            <h3 className="font-medium text-slate-800">Uploader un document</h3>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          </div>
          <label className="block text-sm md:col-span-2">
            <span className="text-xs text-slate-500">Fichier</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-xs text-slate-500">Titre (optionnel)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Catégorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">— choisir —</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs text-slate-500">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="">— choisir —</option>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={upload.isPending || !file}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Uploader
            </button>
          </div>
        </form>
      )}

      {isLoading && <LoadingState label="Chargement des documents…" lines={4} />}
      {isError && (
        <ErrorState
          error={error}
          fallback="Impossible de charger les documents."
          onRetry={() => void refetch()}
        />
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">Titre</th>
                {!simpleMode && <th className="px-4 py-3">Catégorie</th>}
                {!simpleMode && <th className="px-4 py-3">Type</th>}
                {!simpleMode && <th className="px-4 py-3">Mime</th>}
                <th className="px-4 py-3">Taille</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{d.title ?? d.file_name ?? 'Document sans titre'}</td>
                  {!simpleMode && <td className="px-4 py-3">{d.category ?? '—'}</td>}
                  {!simpleMode && (
                    <td className="px-4 py-3">{d.document_type ?? '—'}</td>
                  )}
                  {!simpleMode && <td className="px-4 py-3">{d.mime_type ?? '—'}</td>}
                  <td className="px-4 py-3">
                    {d.file_size != null ? `${Math.round(d.file_size / 1024)} KB` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {!simpleMode && (
                        <button
                          type="button"
                          onClick={() => openPreview(d)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Voir
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(d.id)}
                        className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                      >
                        Télécharger
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={async () => {
                            setActionError(null)
                            try {
                              await docsApi.deleteDocument(d.id)
                              qc.invalidateQueries({ queryKey: ['documents'] })
                            } catch (e) {
                              setActionError(
                                getApiErrorMessage(e, 'Suppression du document impossible.')
                              )
                            }
                          }}
                          className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={simpleMode ? 3 : 6}
                    className="px-4 py-3 text-slate-500"
                  >
                    <EmptyState
                      emoji="📁"
                      title="Aucun document"
                      hint="Ajoutez un fichier pour commencer."
                      action={
                        <button
                          type="button"
                          onClick={() => void refetch()}
                          className="school-btn-secondary"
                        >
                          Réessayer
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm text-slate-700">Voir le document</div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
            <div className="h-[70vh]">
              {previewMime?.startsWith('image/') ? (
                <img src={previewUrl} className="h-full w-full object-contain" />
              ) : previewMime === 'application/pdf' ? (
                <iframe src={previewUrl} className="h-full w-full" />
              ) : (
                <div className="p-4 text-sm text-slate-600">
                  Affichage non disponible pour ce type de fichier. Utilisez “Télécharger”.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

