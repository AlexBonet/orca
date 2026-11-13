import { getMainHttpClient } from '../network/http-client'
import { ensureElectronProxyFromEnvironment } from '../network/proxy-settings'
import { asPlaneRecord } from '../../shared/plane/plane-json'
import { readFetchResponseJsonWithinLimit } from '../../shared/fetch-response-body'

// Plane Cloud only: the API key is never sent to any other origin.
const PLANE_API_BASE = 'https://api.plane.so/api/v1'
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024

export class PlaneApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null
  ) {
    super(message)
    this.name = 'PlaneApiError'
  }
}

function messageForStatus(status: number, detail: string | null): string {
  switch (status) {
    case 401:
      return 'Plane rejected the API key. Check it and try again.'
    case 403:
      return 'This Plane API key cannot access that resource.'
    case 404:
      return 'Plane could not find that workspace or item. Check the workspace slug.'
    case 429:
      return 'Plane rate limit reached. Wait a moment and try again.'
    default:
      return detail
        ? `Plane request failed (${status}): ${detail}`
        : `Plane request failed (${status}).`
  }
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = asPlaneRecord(await response.json())
    const detail = body?.detail ?? body?.error
    return typeof detail === 'string' ? detail.slice(0, 200) : null
  } catch {
    return null
  }
}

export async function planeRequest<T>(
  apiKey: string,
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
  write?: { method: 'POST' | 'PATCH' | 'DELETE'; json?: unknown }
): Promise<T> {
  const url = new URL(`${PLANE_API_BASE}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }
  const httpClient = getMainHttpClient()
  const proxySession = httpClient.proxySession()
  await ensureElectronProxyFromEnvironment({
    ...(proxySession ? { proxySession } : {}),
    probeUrl: url.toString()
  }).catch(() => {})
  let response: Response
  try {
    response = await httpClient.fetch(url.toString(), {
      headers: {
        'X-API-Key': apiKey,
        Accept: 'application/json',
        'User-Agent': 'Orca',
        ...(write?.json !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      ...(write
        ? {
            method: write.method,
            ...(write.json !== undefined ? { body: JSON.stringify(write.json) } : {})
          }
        : {}),
      redirect: 'error',
      ...(signal ? { signal } : {})
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new PlaneApiError('Could not reach Plane. Check your connection and try again.', null)
  }
  if (!response.ok) {
    throw new PlaneApiError(
      messageForStatus(response.status, await readErrorDetail(response)),
      response.status
    )
  }
  if (response.status === 204) {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: callers of body-less writes ignore the result.
    return {} as T
  }
  return readFetchResponseJsonWithinLimit<T>(response, MAX_RESPONSE_BYTES)
}
