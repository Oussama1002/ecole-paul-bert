import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'

interface ExportButtonProps {
  /** Export endpoint, e.g. "/export/students" (the "/v1" prefix is added automatically). */
  endpoint: string
  /** Current page filters to forward to the export (undefined values are dropped). */
  filters?: Record<string, string | number | undefined | null>
  /** Button label. Default: "Exporter". */
  label?: string
  /** Suggested base filename (without extension). Falls back to the server-provided name. */
  filename?: string
}

type Format = 'xlsx' | 'pdf'

function normalizeEndpoint(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return path.startsWith('/v1/') ? path : `/v1${path}`
}

function cleanFilters(
  filters?: Record<string, string | number | undefined | null>
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  if (!filters) return out
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = v
  }
  return out
}

function filenameFromDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? null
}

async function readBlobError(err: unknown): Promise<string> {
  const anyErr = err as { response?: { status?: number; data?: unknown } }
  const status = anyErr?.response?.status
  const data = anyErr?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string }
      if (parsed?.message) return parsed.message
    } catch {
      /* ignore */
    }
  }
  if (status === 413) return 'Trop de données. Veuillez affiner vos filtres.'
  if (status === 403) return "Vous n'avez pas la permission d'exporter ces données."
  return "L'export a échoué. Veuillez réessayer."
}

export function ExportButton({
  endpoint,
  filters,
  label = 'Exporter',
  filename,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<Format | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const runExport = async (format: Format) => {
    setOpen(false)
    setError(null)
    setLoading(format)
    try {
      const res = await apiClient.get<Blob>(normalizeEndpoint(endpoint), {
        params: { ...cleanFilters(filters), format },
        responseType: 'blob',
      })
      const blob = res.data
      const serverName = filenameFromDisposition(
        res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition']
      )
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      const fallback = `${filename ?? 'export'}_${new Date()
        .toISOString()
        .slice(0, 10)}.${ext}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = serverName ?? fallback
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(await readBlobError(err))
    } finally {
      setLoading(null)
    }
  }

  const busy = loading !== null

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden>⬇️</span>
        {busy ? 'Export…' : label}
        <span aria-hidden className="text-xs">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void runExport('xlsx')}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span aria-hidden>📊</span> Excel (.xlsx)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void runExport('pdf')}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span aria-hidden>📄</span> PDF
          </button>
        </div>
      )}

      {error && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-lg">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-semibold underline"
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
