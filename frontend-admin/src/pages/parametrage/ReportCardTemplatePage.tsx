import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as tplApi from '../../api/reportCardTemplate'
import { useAuth } from '../../contexts/AuthContext'

const SECTION_EMOJI: Record<string, string> = {
  header: '🏷️',
  student_info: '🧒',
  kpis: '📊',
  subjects_table: '📚',
  appreciation: '📝',
  signature: '✍️',
  footer: '📄',
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = list.slice()
  const [el] = next.splice(from, 1)
  next.splice(to, 0, el)
  return next
}

export function ReportCardTemplatePage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('report_cards.manage')
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report-card-template'],
    queryFn: tplApi.fetchReportCardTemplate,
  })

  const [tpl, setTpl] = useState<tplApi.BulletinTemplate | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    if (data?.template && tpl === null) {
      setTpl(data.template)
    }
  }, [data, tpl])

  const save = useMutation({
    mutationFn: (t: tplApi.BulletinTemplate) => tplApi.saveReportCardTemplate(t),
    onSuccess: (saved) => {
      setTpl(saved)
      setBanner('Modèle enregistré.')
      queryClient.invalidateQueries({ queryKey: ['report-card-template'] })
    },
    onError: (e: Error) => setBanner(`Erreur : ${e.message}`),
  })

  const reset = useMutation({
    mutationFn: () => tplApi.resetReportCardTemplate(),
    onSuccess: (saved) => {
      setTpl(saved)
      setBanner('Modèle remis à zéro.')
      queryClient.invalidateQueries({ queryKey: ['report-card-template'] })
    },
    onError: (e: Error) => setBanner(`Erreur : ${e.message}`),
  })

  if (isLoading || !tpl) {
    return <p className="text-sm text-school-inkmuted">Chargement du modèle…</p>
  }

  if (isError) {
    return (
      <p className="rounded-2xl border border-school-coral/40 bg-school-coral/10 px-4 py-3 text-sm text-school-coral">
        {(error as Error).message}
      </p>
    )
  }

  const updateSection = (idx: number, patch: Partial<tplApi.BulletinSection>) => {
    setTpl((t) => {
      if (!t) return t
      const sections = t.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s))
      return { ...t, sections }
    })
  }

  const updateChild = (
    sectionIdx: number,
    listKey: 'fields' | 'columns',
    childIdx: number,
    patch: Partial<tplApi.BulletinFieldItem>
  ) => {
    setTpl((t) => {
      if (!t) return t
      const sections = t.sections.slice()
      const section = { ...sections[sectionIdx] }
      const list = (section[listKey] ?? []).slice()
      list[childIdx] = { ...list[childIdx], ...patch }
      section[listKey] = list
      sections[sectionIdx] = section
      return { ...t, sections }
    })
  }

  const moveSection = (idx: number, delta: number) => {
    setTpl((t) => {
      if (!t) return t
      return { ...t, sections: moveItem(t.sections, idx, idx + delta) }
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/bulletins"
            className="text-sm font-semibold text-school-grape underline-offset-4 hover:underline"
          >
            ← Bulletins
          </Link>
          <h2 className="mt-2 font-display text-2xl font-bold text-school-ink sm:text-3xl">
            Modèle de bulletin
          </h2>
          <p className="mt-1 text-sm text-school-inkmuted">
            Activez, renommez, réordonnez les sections. Les calculs (moyennes,
            rang, absences) ne sont pas affectés.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset.mutate()}
              disabled={reset.isPending || save.isPending}
              className="school-btn-secondary disabled:opacity-60"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => save.mutate(tpl)}
              disabled={save.isPending}
              className="school-btn-primary disabled:opacity-60"
            >
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {banner && (
        <p className="mb-4 rounded-2xl border border-school-leaf/40 bg-school-leaf/10 px-4 py-3 text-sm font-semibold text-school-leafdeep">
          {banner}
        </p>
      )}

      <section className="mb-6 rounded-3xl border-2 border-school-border/70 bg-white p-5 shadow-school sm:p-6">
        <h3 className="font-display text-lg font-semibold text-school-ink">
          Identité de l’école
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Nom de l’école
            </span>
            <input
              value={tpl.school.name}
              disabled={!canManage}
              onChange={(e) =>
                setTpl({ ...tpl, school: { ...tpl.school, name: e.target.value } })
              }
              className="school-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Titre du bulletin
            </span>
            <input
              value={tpl.title}
              disabled={!canManage}
              onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
              className="school-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Adresse
            </span>
            <input
              value={tpl.school.address}
              disabled={!canManage}
              onChange={(e) =>
                setTpl({ ...tpl, school: { ...tpl.school, address: e.target.value } })
              }
              className="school-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Ville
            </span>
            <input
              value={tpl.school.city}
              disabled={!canManage}
              onChange={(e) =>
                setTpl({ ...tpl, school: { ...tpl.school, city: e.target.value } })
              }
              className="school-input"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
              Chemin du logo (optionnel, relatif à <code>storage/app/</code>)
            </span>
            <input
              value={tpl.school.logo_path ?? ''}
              disabled={!canManage}
              onChange={(e) =>
                setTpl({
                  ...tpl,
                  school: {
                    ...tpl.school,
                    logo_path: e.target.value.trim() === '' ? null : e.target.value,
                  },
                })
              }
              placeholder="branding/logo.png"
              className="school-input font-mono text-sm"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-school-ink">
          Sections du bulletin
        </h3>

        {tpl.sections.map((section, sIdx) => (
          <article
            key={section.key}
            className={[
              'rounded-3xl border-2 bg-white p-5 shadow-school transition',
              section.enabled
                ? 'border-school-border/70'
                : 'border-dashed border-school-border/60 opacity-70',
            ].join(' ')}
          >
            <header className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-school-sunsoft text-xl">
                {SECTION_EMOJI[section.key] ?? '📎'}
              </span>
              <code className="rounded-full bg-school-mist/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-school-skydeep">
                {section.key}
              </code>
              <label className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-school-ink">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  disabled={!canManage}
                  onChange={(e) => updateSection(sIdx, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-school-border"
                />
                Visible
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!canManage || sIdx === 0}
                  onClick={() => moveSection(sIdx, -1)}
                  className="rounded-xl border-2 border-school-border/60 bg-white px-2 py-1 text-sm font-bold text-school-ink disabled:opacity-40"
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={!canManage || sIdx === tpl.sections.length - 1}
                  onClick={() => moveSection(sIdx, 1)}
                  className="rounded-xl border-2 border-school-border/60 bg-white px-2 py-1 text-sm font-bold text-school-ink disabled:opacity-40"
                  title="Descendre"
                >
                  ↓
                </button>
              </div>
            </header>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                  Libellé affiché
                </span>
                <input
                  value={section.label}
                  disabled={!canManage}
                  onChange={(e) => updateSection(sIdx, { label: e.target.value })}
                  className="school-input"
                />
              </label>

              {section.text !== undefined && (
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-school-inkmuted">
                    Texte
                  </span>
                  <textarea
                    value={section.text ?? ''}
                    disabled={!canManage}
                    onChange={(e) => updateSection(sIdx, { text: e.target.value })}
                    rows={section.key === 'appreciation' ? 4 : 2}
                    className="school-input"
                  />
                </label>
              )}
            </div>

            {section.fields && section.fields.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Champs affichés
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.fields.map((f, fIdx) => (
                    <div
                      key={f.key}
                      className="flex items-center gap-2 rounded-2xl border border-school-border/60 bg-school-cream/60 p-2"
                    >
                      <input
                        type="checkbox"
                        checked={f.enabled}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateChild(sIdx, 'fields', fIdx, { enabled: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-school-border"
                      />
                      <input
                        value={f.label}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateChild(sIdx, 'fields', fIdx, { label: e.target.value })
                        }
                        className="school-input !py-1.5 !text-sm"
                      />
                      <code className="hidden rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-school-inkmuted sm:inline">
                        {f.key}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.columns && section.columns.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-school-inkmuted">
                  Colonnes du tableau
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {section.columns.map((c, cIdx) => (
                    <div
                      key={c.key}
                      className="flex items-center gap-2 rounded-2xl border border-school-border/60 bg-school-cream/60 p-2"
                    >
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateChild(sIdx, 'columns', cIdx, { enabled: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-school-border"
                      />
                      <input
                        value={c.label}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateChild(sIdx, 'columns', cIdx, { label: e.target.value })
                        }
                        className="school-input !py-1.5 !text-sm"
                      />
                      <code className="hidden rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-school-inkmuted sm:inline">
                        {c.key}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>

      <p className="mt-6 text-xs text-school-inkmuted">
        Les nouveaux bulletins générés après l’enregistrement utiliseront ce
        modèle. Les bulletins déjà générés conservent leur PDF actuel jusqu’à
        la prochaine régénération.
      </p>
    </div>
  )
}
