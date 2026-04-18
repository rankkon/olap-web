import type { ApiEnvelope } from '../types/api'

const DEFAULT_API_BASE_URL = 'http://localhost:5180'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  ? (import.meta.env.VITE_API_BASE_URL as string).trim()
  : DEFAULT_API_BASE_URL

function parseErrorPayload(raw: string): string {
  if (!raw) {
    return 'Unknown API error.'
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ApiEnvelope<unknown>>
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return parsed.message
    }
  } catch {
    // Ignore JSON parse errors and fallback to raw text.
  }

  return raw
}

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(parseErrorPayload(raw))
  }

  const envelope = (await response.json()) as ApiEnvelope<T>
  if (!envelope.success) {
    throw new Error(envelope.message || 'API returned success=false.')
  }

  if (envelope.data == null) {
    throw new Error('API returned empty data.')
  }

  return envelope.data
}
