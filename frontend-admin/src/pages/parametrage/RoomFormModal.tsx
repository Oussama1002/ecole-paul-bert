import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import * as roomsApi from '../../api/rooms'

function autoRoomCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
}

const ROOM_TYPES = [
  ['classroom', 'Salle de classe'],
  ['lab', 'Laboratoire'],
  ['hall', 'Salle polyvalente'],
  ['office', 'Bureau'],
  ['library', 'Bibliothèque'],
  ['sports', 'Sport'],
  ['other', 'Autre'],
] as const

export function RoomFormModal({
  roomId,
  onClose,
}: {
  roomId: number | null
  onClose: () => void
}) {
  const isNew = roomId === null
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsApi.fetchRoom(roomId as number),
    enabled: !isNew && roomId != null,
  })

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeManual, setCodeManual] = useState(false)
  const [roomType, setRoomType] = useState<string>('classroom')
  const [capacity, setCapacity] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('available')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!codeManual && isNew) setCode(autoRoomCode(name))
  }, [name, codeManual, isNew])

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setCode(existing.code)
    setCodeManual(true)
    setRoomType(existing.room_type)
    setCapacity(existing.capacity != null ? String(existing.capacity) : '')
    setLocation(existing.location ?? '')
    setStatus(existing.status)
    setNotes(existing.notes ?? '')
  }, [existing])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        code,
        room_type: roomType,
        capacity: capacity ? parseInt(capacity, 10) : null,
        location: location || null,
        status,
        notes: notes || null,
      }
      if (isNew) return roomsApi.createRoom(payload)
      return roomsApi.updateRoom(roomId as number, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
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
            {isNew ? 'Nouvelle salle' : 'Modifier la salle'}
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Type</span>
                <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="school-select">
                  {ROOM_TYPES.map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Capacité</span>
                <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Emplacement</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="school-input" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Statut</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="school-select">
                  <option value="available">Disponible</option>
                  <option value="unavailable">Indisponible</option>
                  <option value="maintenance">En maintenance</option>
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">Notes</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="school-input" />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="school-btn-secondary">Annuler</button>
              <button type="submit" disabled={save.isPending} className="school-btn-primary disabled:opacity-60">
                {save.isPending ? 'Enregistrement…' : isNew ? 'Créer la salle' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
