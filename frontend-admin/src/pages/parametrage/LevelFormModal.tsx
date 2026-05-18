import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as levelsApi from '../../api/levels'

export function LevelFormModal({
  levelId,
  onClose,
}: {
  levelId: number | null
  onClose: () => void
}) {
  const isNew = levelId === null
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['level', levelId],
    queryFn: () => levelsApi.fetchLevel(levelId as number),
    enabled: !isNew && levelId != null,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? '')
    setSortOrder(existing.sort_order)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        sort_order: sortOrder,
      }
      if (isNew) return levelsApi.createLevel(payload)
      return levelsApi.updateLevel(levelId as number, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            {isNew ? 'Nouveau niveau' : 'Modifier le niveau'}
          </h3>
          <button type="button" onClick={onClose} className="text-xl leading-none text-school-inkmuted hover:text-school-ink">✕</button>
        </div>

        {!isNew && isLoading ? (
          <p className="p-6 text-sm text-school-inkmuted">Chargement…</p>
        ) : (
          <form
            onSubmit={(e: FormEvent) => { e.preventDefault(); setError(null); save.mutate() }}
            className="space-y-4 p-6"
          >
            {error && (
              <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm font-semibold text-[#B23A2E]">{error}</p>
            )}

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Nom *</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="school-input" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Ordre d'affichage</span>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="school-input"
              />
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                {save.isPending ? 'Enregistrement…' : isNew ? 'Créer le niveau' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
