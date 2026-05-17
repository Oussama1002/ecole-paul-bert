import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import * as docsApi from '../../api/documents'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../../contexts/AuthContext'
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
  const canManage = hasPermission('documents.manage')

  // List filters
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')

  // Upload modal state
  const [showModal, setShowModal] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadType, setUploadType] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewMime, setPreviewMime] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['documents', filterCategory, filterType],
    queryFn: () =>
      docsApi.fetchDocuments({
        per_page: 100,
        category: filterCategory || undefined,
        document_type: filterType || undefined,
      }),
  })

  const closeModal = () => {
    setShowModal(false)
    setFile(null)
    setTitle('')
    setUploadCategory('')
    setUploadType('')
    setUploadError(null)
  }

  const upload = useMutation({
    mutationFn: async () => {
      setUploadError(null)
      if (!file) throw new Error('Sélectionnez un fichier.')
      await docsApi.uploadDocument({
        file,
        category: uploadCategory || undefined,
        document_type: uploadType || undefined,
        title: title || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      closeModal()
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
          <p className="text-sm text-slate-500">Upload, filtres, aperçu, téléchargement, suppression.</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowModal(true)} className="school-btn-primary">
            + Téléverser un document
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-xs text-slate-500">Catégorie</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Tous</option>
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        {(filterCategory || filterType) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setFilterCategory(''); setFilterType('') }}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showModal && canManage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
              <h3 className="font-display text-lg font-bold text-school-ink">Téléverser un document</h3>
              <button type="button" onClick={closeModal} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
            </div>
            <form
              className="space-y-4 p-6"
              onSubmit={(e) => { e.preventDefault(); upload.mutate() }}
            >
              {uploadError && (
                <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{uploadError}</p>
              )}

              <label className="block text-sm">
                <span className="text-xs text-slate-500">Fichier *</span>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                {file && (
                  <span className="mt-1 block text-xs text-school-inkmuted">{file.name} — {Math.round(file.size / 1024)} KB</span>
                )}
              </label>

              <label className="block text-sm">
                <span className="text-xs text-slate-500">Titre (optionnel)</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex. Contrat enseignant 2025"
                  className="school-input"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs text-slate-500">Catégorie</span>
                  <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="school-select">
                    <option value="">— choisir —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-slate-500">Type</span>
                  <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="school-select">
                    <option value="">— choisir —</option>
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="school-btn-secondary">Annuler</button>
                <button
                  type="submit"
                  disabled={upload.isPending || !file}
                  className="school-btn-primary disabled:opacity-60"
                >
                  {upload.isPending ? 'Envoi en cours…' : 'Téléverser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && <LoadingState label="Chargement des documents…" lines={4} />}
      {isError && (
        <ErrorState error={error} fallback="Impossible de charger les documents." onRetry={() => void refetch()} />
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Taille</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{d.title ?? d.file_name ?? 'Document sans titre'}</td>
                  <td className="px-4 py-3">{CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category ?? '—'}</td>
                  <td className="px-4 py-3">{DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type ?? '—'}</td>
                  <td className="px-4 py-3">{d.file_size != null ? `${Math.round(d.file_size / 1024)} KB` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => openPreview(d)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Voir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(d.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
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
                              setActionError(getApiErrorMessage(e, 'Suppression impossible.'))
                            }
                          }}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
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
                  <td colSpan={5} className="px-4 py-3 text-slate-500">
                    <EmptyState
                      emoji="📁"
                      title="Aucun document"
                      hint="Ajoutez un fichier pour commencer."
                      action={
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button type="button" onClick={() => void refetch()} className="school-btn-secondary">
                            Réessayer
                          </button>
                          {canManage && (
                            <button type="button" onClick={() => setShowModal(true)} className="school-btn-primary">
                              + Téléverser un document
                            </button>
                          )}
                        </div>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">Aperçu du document</span>
              <button type="button" onClick={closePreview} className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">
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
                  Affichage non disponible pour ce type de fichier. Utilisez "Télécharger".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
