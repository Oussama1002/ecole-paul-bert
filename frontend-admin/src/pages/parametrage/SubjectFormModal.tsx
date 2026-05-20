import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as levelsApi from '../../api/levels'
import * as subjectsApi from '../../api/subjects'

export function SubjectFormModal({
  subjectId,
  onClose,
}: {
  subjectId: number | null
  onClose: () => void
}) {
  const isNew = subjectId === null
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => subjectsApi.fetchSubject(subjectId as number),
    enabled: !isNew && subjectId != null,
  })

  const { data: levels } = useQuery({
    queryKey: ['levels-all'],
    queryFn: () => levelsApi.fetchLevels({ per_page: 200, sort_by: 'sort_order', sort_order: 'asc' }),
  })

  const [levelId, setLevelId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coefficient, setCoefficient] = useState('1')
  const [isOptional, setIsOptional] = useState(false)
  const [status, setStatus] = useState('active')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setLevelId(existing.level_id ?? '')
    setName(existing.name)
    setDescription(existing.description ?? '')
    setCoefficient(String(existing.coefficient))
    setIsOptional(existing.is_optional)
    setStatus(existing.status)
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name,
        description: description || null,
        coefficient: parseFloat(coefficient) || 1,
        is_optional: isOptional,
        status,
        level_id: levelId === '' ? null : levelId,
      }
      if (isNew) return subjectsApi.createSubject(base)
      return subjectsApi.updateSubject(subjectId as number, base)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
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
            {isNew ? 'Nouvelle matière' : 'Modifier la matière'}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Nom *</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Coefficient</span>
                <input type="number" step="0.01" min={0} value={coefficient} onChange={(e) => setCoefficient(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Niveau</span>
                <select value={levelId === '' ? '' : levelId} onChange={(e) => setLevelId(e.target.value === '' ? '' : Number(e.target.value))} className="school-select">
                  <option value="">— Tous —</option>
                  {levels?.items.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Statut</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="school-select">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="school-input" />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} className="h-4 w-4" />
                <span className="text-school-ink">Matière optionnelle</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                {save.isPending ? 'Enregistrement…' : isNew ? 'Créer la matière' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
