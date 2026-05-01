import { useEffect, useMemo, useRef, useState } from 'react'

export type SearchSelectOption = {
  value: number
  label: string
  hint?: string
}

type Props = {
  value: number | null
  onChange: (value: number | null) => void
  options: SearchSelectOption[]
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  isError?: boolean
  emptyLabel?: string
  errorLabel?: string
  loadingLabel?: string
  className?: string
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Rechercher…',
  disabled,
  isLoading,
  isError,
  emptyLabel = 'Aucun résultat.',
  errorLabel = 'Erreur de chargement.',
  loadingLabel = 'Chargement…',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 50)
    return options
      .filter((o) => {
        const hay = `${o.label} ${o.hint ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 50)
  }, [options, query])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const buttonLabel = selected
    ? selected.hint
      ? `${selected.label} — ${selected.hint}`
      : selected.label
    : ''

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm disabled:opacity-60"
      >
        <span className={buttonLabel ? 'text-slate-800' : 'text-slate-400'}>
          {buttonLabel || placeholder}
        </span>
        <span className="ml-2 text-xs text-slate-400">▾</span>
      </button>
      {open && !disabled ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500">{loadingLabel}</div>
            ) : isError ? (
              <div className="px-3 py-2 text-sm text-red-600">{errorLabel}</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">{emptyLabel}</div>
            ) : (
              <ul>
                {value !== null ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(null)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                    >
                      Effacer la sélection
                    </button>
                  </li>
                ) : null}
                {filtered.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 ${
                        o.value === value ? 'bg-indigo-50 font-medium' : ''
                      }`}
                    >
                      <div className="text-slate-800">{o.label}</div>
                      {o.hint ? (
                        <div className="text-xs text-slate-500">{o.hint}</div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
