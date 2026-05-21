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
    m.includes('undefined property') ||
    m.includes('request failed with status code') ||
    m.includes('network error') ||
    m === 'unprocessable content'
  )
}

/** Map Laravel default English validation text to French UI copy. */
function translateKnownValidationMessage(msg: string): string {
  const m = msg.toLowerCase().trim()
  if (
    m.includes('email') &&
    (m.includes('already been taken') ||
      m.includes('has already been taken') ||
      m.includes('already exists'))
  ) {
    return 'Cet e-mail est déjà utilisé par un autre compte.'
  }
  if (
    m.includes('username') &&
    (m.includes('already been taken') || m.includes('has already been taken'))
  ) {
    return 'Cet identifiant est déjà utilisé.'
  }
  if (m === 'validation.unique' || m.includes('validation.unique')) {
    return 'Cette valeur existe déjà. Modifiez l’entrée existante ou choisissez un autre code.'
  }
  if (
    (m.includes('code') && m.includes('already')) ||
    m.includes('déjà utilisé') ||
    m.includes('existe déjà')
  ) {
    return msg
  }
  if (m.includes('already been taken') || m.includes('has already been taken')) {
    return 'Cette valeur est déjà utilisée.'
  }
  return msg
}

function normalizeErrorsObject(
  errors: unknown
): Record<string, string[]> | null {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return null
  }
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      const msgs = value
        .filter((v): v is string => typeof v === 'string')
        .map(translateKnownValidationMessage)
      if (msgs.length > 0) {
        out[key] = msgs
      }
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

function extractValidationPayload(data: unknown): {
  message?: string
  errors?: Record<string, string[]>
} | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }
  const body = data as Record<string, unknown>
  const errors = normalizeErrorsObject(body.errors)

  if (isApiErrorPayload(data)) {
    return {
      message:
        typeof body.message === 'string' ? body.message : undefined,
      errors: errors ?? undefined,
    }
  }

  if (errors) {
    return {
      message:
        typeof body.message === 'string' ? body.message : undefined,
      errors,
    }
  }

  if (typeof body.message === 'string') {
    return { message: body.message }
  }

  return null
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

/** Prefer email (and other field) messages over generic summary text. */
function firstApiFieldMessage(
  errors: Record<string, string[]> | undefined
): string | null {
  if (!errors) {
    return null
  }
  const priority = ['email', 'username', 'password', 'role_id', 'teacher_id', 'code', 'name', 'start_date']
  for (const key of priority) {
    const msgs = errors[key]
    if (msgs?.[0]) {
      return msgs[0]
    }
  }
  for (const msgs of Object.values(errors)) {
    if (msgs[0]) {
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
  const payload = extractValidationPayload(data)
  if (!payload) {
    return 'Une erreur est survenue. Réessayez dans un instant.'
  }
  const fieldMsg = firstApiFieldMessage(payload.errors)
  if (fieldMsg) {
    return fieldMsg
  }
  return safeUiMessage(
    payload.message ? translateKnownValidationMessage(payload.message) : undefined,
    'Une erreur est survenue. Réessayez dans un instant.'
  )
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Impossible de charger le tableau de bord.'
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (data !== undefined && data !== null) {
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
  const payload = extractValidationPayload(error.response?.data)
  return payload?.errors ?? {}
}
