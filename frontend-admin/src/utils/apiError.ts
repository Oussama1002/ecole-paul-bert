import type { AxiosError } from 'axios'
import type { ApiEnvelope, ApiError } from '../types/api'

function isAxiosError(value: unknown): value is AxiosError<ApiEnvelope<unknown>> {
  return typeof value === 'object' && value !== null && 'isAxiosError' in value
}

function isApiErrorPayload(data: unknown): data is ApiError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as ApiError).success === false &&
    typeof (data as ApiError).message === 'string'
  )
}

function looksTechnicalMessage(msg: string): boolean {
  const m = msg.toLowerCase()
  return (
    m.includes('sqlstate') ||
    m.includes('syntax error') ||
    m.includes('exception') ||
    m.includes('stack trace') ||
    m.includes(' at line ') ||
    m.includes('integrity constraint') ||
    m.includes('undefined index') ||
    m.includes('undefined property')
  )
}

function safeUiMessage(msg: string | null | undefined, fallback: string): string {
  const clean = (msg ?? '').trim()
  if (!clean) return fallback
  if (looksTechnicalMessage(clean)) return fallback
  const lower = clean.toLowerCase()
  if (lower.includes('resource not found') || lower.includes('not found')) {
    return 'Donnée introuvable'
  }
  return clean
}

/** First validation-style message from API `errors` object, if any. */
function firstApiFieldMessage(errors: ApiError['errors']): string | null {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return null
  }
  for (const msgs of Object.values(errors)) {
    if (Array.isArray(msgs) && msgs.length > 0 && typeof msgs[0] === 'string') {
      return msgs[0]
    }
  }
  return null
}

/**
 * Human-readable message from a failed API envelope (422 validation, 403, etc.).
 * Prefer field errors over generic English Laravel messages.
 */
export function messageFromFailedApiPayload(data: unknown): string {
  if (!isApiErrorPayload(data)) {
    return 'Une erreur est survenue. Réessayez dans un instant.'
  }
  const fieldMsg = firstApiFieldMessage(data.errors)
  if (fieldMsg) {
    return fieldMsg
  }
  return safeUiMessage(
    data.message,
    'Une erreur est survenue. Réessayez dans un instant.'
  )
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Impossible de charger le tableau de bord.'
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (isApiErrorPayload(data)) {
      return messageFromFailedApiPayload(data)
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Erreur réseau: impossible de joindre le serveur.'
    }
  }

  if (error instanceof Error && error.message) {
    return safeUiMessage(error.message, fallback)
  }

  return fallback
}

export function getApiFieldErrors(error: unknown): Record<string, string[]> {
  if (!isAxiosError(error)) return {}
  const data = error.response?.data
  if (!isApiErrorPayload(data)) return {}
  if (!data.errors || Array.isArray(data.errors)) return {}
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(data.errors)) {
    if (Array.isArray(value)) {
      out[key] = value.filter((v): v is string => typeof v === 'string')
    }
  }
  return out
}
