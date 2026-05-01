import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import * as roomsApi from '../../api/rooms'

const ROOM_TYPES = [
  ['classroom', 'Salle de classe'],
  ['lab', 'Laboratoire'],
  ['hall', 'Salle polyvalente'],
  ['office', 'Bureau'],
  ['library', 'Bibliothèque'],
  ['sports', 'Sport'],
  ['other', 'Autre'],
] as const

export function RoomFormPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !!matchPath('/parametrage/salles/nouveau', pathname)
  const editMatch = matchPath('/parametrage/salles/:id/editer', pathname)
  const id = editMatch?.params?.id ? parseInt(editMatch.params.id, 10) : NaN

  const { data: existing, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.fetchRoom(id),
    enabled: !isNew && !Number.isNaN(id),
  })

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [roomType, setRoomType] = useState<string>('classroom')
  const [capacity, setCapacity] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('available')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setCode(existing.code)
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
      if (isNew) {
        return roomsApi.createRoom(payload)
      }
      return roomsApi.updateRoom(id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      navigate('/parametrage/salles')
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Chargement…</p>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/parametrage/salles"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Salles
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">
          {isNew ? 'Nouvelle salle' : 'Modifier la salle'}
        </h2>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
        className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Nom</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Code</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Type</span>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {ROOM_TYPES.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Capacité</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Emplacement</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="available">Disponible</option>
            <option value="unavailable">Indisponible</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Enregistrer
          </button>
          <Link
            to="/parametrage/salles"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
