import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as schoolYearsApi from '../../api/schoolYears'
import { getApiErrorMessage } from '../../utils/apiError'

export function SchoolYearFormModal({
  yearId,
  onClose,
}: {
  yearId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['school-year', yearId],
    queryFn: () => schoolYearsApi.fetchSchoolYear(yearId),
  })

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('planned')
  const [isCurrent, setIsCurrent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setStartDate(existing.start_date)
    setEndDate(existing.end_date)
    setStatus(existing.status)
    setIsCurrent(existing.is_current)
  }, [existing])

  const save = useMutation({
    mutationFn: () =>
      schoolYearsApi.updateSchoolYear(yearId, {
        name,
        start_date: startDate,
        end_date: endDate,
        status,
        is_current: isCurrent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] })
      queryClient.invalidateQueries({ queryKey: ['school-year', yearId] })
      onClose()
    },
    onError: (e: unknown) =>
      setError(getApiErrorMessage(e, 'Enregistrement impossible.')),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    save.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-school-border/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-school-line bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-school-ink">
            Modifier l&apos;année scolaire
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-school-inkmuted hover:text-school-ink"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-school-inkmuted">Chargement…</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 p-6">
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">Nom</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="school-input w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">
                Date de début
              </span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="school-input w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">
                Date de fin
              </span>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="school-input w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-school-inkmuted">Statut</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="school-select w-full"
              >
                <option value="planned">Planifiée</option>
                <option value="active">Active</option>
                <option value="closed">Clôturée</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
              />
              <span>Année courante</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary text-sm">
                Annuler
              </button>
              <button
                type="submit"
                disabled={save.isPending}
                className="school-btn-primary text-sm disabled:opacity-60"
              >
                {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
