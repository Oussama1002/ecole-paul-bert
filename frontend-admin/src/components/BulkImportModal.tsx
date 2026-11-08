import { useRef, useState } from 'react'
import {
  downloadImportTemplate,
  runImport,
  type ImportResult,
  type ImportType,
} from '../api/imports'
import { getApiErrorMessage } from '../utils/apiError'

type Props = {
  type: ImportType
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const ACCEPT = '.csv,.xlsx,.xls,.txt'
const MAX_BYTES = 5 * 1024 * 1024

const COPY: Record<ImportType, { emoji: string; title: string; columns: string }> = {
  students: {
    emoji: '🎒',
    title: 'Importer des élèves',
    columns: 'nom, prenom, date_naissance, sexe, classe, responsable_nom, responsable_prenom, responsable_telephone, responsable_email',
  },
  teachers: {
    emoji: '👩‍🏫',
    title: 'Importer des enseignants',
    columns: 'nom, prenom, email, telephone, specialite',
  },
}

export function BulkImportModal({ type, open, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingTpl, setDownloadingTpl] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  if (!open) return null

  const copy = COPY[type]

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
    setUploading(false)
  }

  function handleClose() {
    if (uploading) return
    reset()
    onClose()
  }

  function pickFile(f: File | undefined | null) {
    if (!f) return
    setError(null)
    setResult(null)
    if (f.size > MAX_BYTES) {
      setError('Le fichier dépasse la taille maximale de 5 Mo.')
      return
    }
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const res = await runImport(type, file)
      setResult(res)
    } catch (e) {
      setError(getApiErrorMessage(e, "L'import a échoué."))
    } finally {
      setUploading(false)
    }
  }

  async function handleTemplate() {
    setDownloadingTpl(true)
    try {
      await downloadImportTemplate(type)
    } catch (e) {
      setError(getApiErrorMessage(e, 'Téléchargement du modèle impossible.'))
    } finally {
      setDownloadingTpl(false)
    }
  }

  function handleDone() {
    onSuccess()
    reset()
    onClose()
  }

  const credentials = result?.credentials ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8 sm:pt-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border-2 border-school-line bg-school-bg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b-2 border-school-line bg-gradient-to-r from-school-sky/10 via-school-grape/10 to-school-bubblegum/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              {copy.emoji}
            </span>
            <h2 className="font-display text-xl font-bold text-school-ink">{copy.title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="rounded-xl border-2 border-school-line bg-white px-3 py-1 text-sm font-semibold text-school-inkmuted hover:bg-school-cream disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Result view */}
          {result ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border-2 border-school-leaf/20 bg-school-leaf/5 p-4 text-center">
                  <p className="font-display text-3xl font-bold text-school-leafdeep">{result.inserted}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-school-leafdeep/70">Importés</p>
                </div>
                <div className="rounded-2xl border-2 border-school-sun/30 bg-school-sun/10 p-4 text-center">
                  <p className="font-display text-3xl font-bold text-[#92400E]">{result.skipped}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#92400E]/70">Ignorés</p>
                </div>
                <div className="rounded-2xl border-2 border-school-coral/20 bg-school-coral/5 p-4 text-center">
                  <p className="font-display text-3xl font-bold text-[#B23A2E]">{result.errors.length}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#B23A2E]/70">Erreurs</p>
                </div>
              </div>

              {credentials.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold text-school-ink">
                    Identifiants générés — à transmettre aux enseignants
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-2xl border-2 border-school-line">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-school-cream text-xs uppercase tracking-wider text-school-inkmuted">
                        <tr>
                          <th className="px-3 py-2">Nom</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Mot de passe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credentials.map((c, i) => (
                          <tr key={`${c.email}-${i}`} className="border-t border-school-line">
                            <td className="px-3 py-2 font-semibold text-school-ink">{c.name}</td>
                            <td className="px-3 py-2 text-school-inkmuted">{c.email}</td>
                            <td className="px-3 py-2 font-mono text-school-ink">{c.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold text-school-ink">Lignes en erreur</p>
                  <div className="max-h-48 overflow-y-auto rounded-2xl border-2 border-school-line">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-school-cream text-xs uppercase tracking-wider text-school-inkmuted">
                        <tr>
                          <th className="px-3 py-2 w-16">Ligne</th>
                          <th className="px-3 py-2 w-40">Champ</th>
                          <th className="px-3 py-2">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e, i) => (
                          <tr key={`${e.row}-${e.field}-${i}`} className="border-t border-school-line">
                            <td className="px-3 py-2 font-mono text-school-inkmuted">{e.row}</td>
                            <td className="px-3 py-2 font-semibold text-[#B23A2E]">{e.field}</td>
                            <td className="px-3 py-2 text-school-ink">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={reset} className="school-btn-secondary">
                  Importer un autre fichier
                </button>
                <button type="button" onClick={handleDone} className="school-btn-primary">
                  Terminé
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-school-inkmuted">
                Formats acceptés : CSV, XLSX, XLS (max 5 Mo). Colonnes attendues :{' '}
                <span className="font-semibold text-school-ink">{copy.columns}</span>.
              </p>

              <button
                type="button"
                onClick={handleTemplate}
                disabled={downloadingTpl}
                className="text-sm font-semibold text-school-skydeep underline-offset-2 hover:underline disabled:opacity-50"
              >
                {downloadingTpl ? 'Préparation…' : '⬇ Télécharger le modèle Excel'}
              </button>

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  pickFile(e.dataTransfer.files?.[0])
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragging
                    ? 'border-school-skydeep bg-school-sky/10'
                    : 'border-school-line bg-white hover:border-school-skydeep/50 hover:bg-school-cream/40'
                }`}
              >
                <span className="text-3xl">{file ? '📄' : '⬆️'}</span>
                {file ? (
                  <p className="text-sm font-bold text-school-ink">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-school-ink">
                      Glissez-déposez un fichier ici
                    </p>
                    <p className="text-xs text-school-inkmuted">ou cliquez pour parcourir</p>
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />

              {error && (
                <div className="rounded-2xl border-2 border-school-coral/30 bg-school-coral/5 px-4 py-3 text-sm font-semibold text-[#B23A2E]">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading}
                  className="school-btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="school-btn-primary"
                >
                  {uploading ? 'Import en cours…' : 'Importer'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
