import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import * as api from '../../api/notificationSettings'
import type {
  NotificationChannel,
  NotificationCategory,
  NotificationPreference,
} from '../../api/notificationSettings'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  absence: 'Absences',
  late: 'Retards',
  payment_reminder: 'Rappel paiement',
  payment_received: 'Paiement reçu',
  announcement: 'Annonces',
  report_card: 'Bulletins',
  general: 'Général',
}

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  in_app: 'In-App',
}

type PrefKey = `${NotificationCategory}|${NotificationChannel}`

function keyOf(category: NotificationCategory, channel: NotificationChannel): PrefKey {
  return `${category}|${channel}`
}

export function NotificationPreferencesPage() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: api.fetchNotificationPreferences,
  })

  // Local mirror so toggles feel instant; synced from server on load.
  const [state, setState] = useState<Record<string, boolean>>({})
  const [testFeedback, setTestFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null)

  useEffect(() => {
    if (!data) return
    const next: Record<string, boolean> = {}
    for (const p of data.preferences) {
      next[keyOf(p.category, p.channel)] = p.enabled
    }
    setState(next)
  }, [data])

  const saveMut = useMutation({
    mutationFn: (prefs: NotificationPreference[]) =>
      api.updateNotificationPreferences(prefs),
    onSuccess: (payload) => {
      qc.setQueryData(['notification-preferences'], payload)
    },
  })

  const testMut = useMutation({
    mutationFn: api.sendTestNotification,
    onSuccess: (res) => {
      const chans = res.channels.map((c) => CHANNEL_LABELS[c as NotificationChannel] ?? c)
      setTestFeedback({
        ok: true,
        message: `Test envoyé (${chans.join(', ') || 'aucun canal disponible'}).${
          res.queued ? ' L’envoi est mis en file d’attente.' : ''
        }`,
      })
    },
    onError: (e) => {
      setTestFeedback({ ok: false, message: (e as Error).message })
    },
  })

  const categories = data?.categories ?? []
  const channels = useMemo<NotificationChannel[]>(
    () => (data?.channels ?? ['email', 'sms', 'in_app']) as NotificationChannel[],
    [data?.channels]
  )

  const toggle = (category: NotificationCategory, channel: NotificationChannel) => {
    const k = keyOf(category, channel)
    const nextEnabled = !state[k]
    setState((prev) => ({ ...prev, [k]: nextEnabled }))
    saveMut.mutate([{ category, channel, enabled: nextEnabled }])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Préférences de notification
          </h2>
          <p className="text-sm text-slate-500">
            Choisissez les canaux par type de notification (e-mail, SMS,
            notifications internes).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTestFeedback(null)
            testMut.mutate()
          }}
          disabled={testMut.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {testMut.isPending ? 'Envoi…' : 'Tester la configuration'}
        </button>
      </div>

      {testFeedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            testFeedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {testFeedback.message}
        </div>
      )}

      {saveMut.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible d’enregistrer la préférence : {(saveMut.error as Error).message}
        </div>
      )}

      {isLoading && <LoadingState label="Chargement des préférences…" lines={4} />}
      {error && (
        <ErrorState error={error} fallback="Impossible de charger les préférences." />
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Type de notification</th>
                {channels.map((ch) => (
                  <th key={ch} className="px-4 py-3 text-center">
                    {CHANNEL_LABELS[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </td>
                  {channels.map((ch) => {
                    const k = keyOf(cat, ch)
                    const enabled = Boolean(state[k])
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <ToggleSwitch
                          enabled={enabled}
                          onChange={() => toggle(cat, ch)}
                          label={`${CATEGORY_LABELS[cat] ?? cat} — ${CHANNEL_LABELS[ch]}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ToggleSwitch({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        enabled ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
