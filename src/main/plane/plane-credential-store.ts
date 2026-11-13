import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { writeEncryptedCredential } from '../credentials/integration-credential-file'
import { readCredentialFileProtection } from '../credentials/credential-file-protection'
import { createIntegrationStateFileCache } from '../credentials/integration-state-file-cache'
import { createIntegrationTokenFileCache } from '../credentials/integration-token-file-cache'
import { asPlaneRecord } from '../../shared/plane/plane-json'
import type { SecretAtRestProtection } from '../../shared/secret-at-rest-protection'
import type { PlaneWorkspaceConnection } from '../../shared/plane/plane-types'

// Stored under ~/.orca (never inside a repo checkout) so the API key cannot be committed.
function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getConnectionFilePath(): string {
  return join(getOrcaDir(), 'plane-workspace.json')
}

function getTokenDir(): string {
  return join(getOrcaDir(), 'plane-tokens')
}

function getTokenPath(workspaceSlug: string): string {
  return join(getTokenDir(), `${Buffer.from(workspaceSlug).toString('base64url')}.enc`)
}

const connectionFileCache = createIntegrationStateFileCache<PlaneWorkspaceConnection | null>({
  filePath: getConnectionFilePath,
  readFromDisk: readConnectionFromDisk
})
const tokenFileCache = createIntegrationTokenFileCache({ service: 'Plane', filePath: getTokenPath })

function readConnectionFromDisk(): PlaneWorkspaceConnection | null {
  const path = getConnectionFilePath()
  if (!existsSync(path)) {
    return null
  }
  try {
    const parsed = asPlaneRecord(JSON.parse(readFileSync(path, { encoding: 'utf-8' })))
    const viewer = asPlaneRecord(parsed?.viewer)
    if (
      !parsed ||
      typeof parsed.workspaceSlug !== 'string' ||
      !viewer ||
      typeof viewer.id !== 'string' ||
      typeof viewer.displayName !== 'string'
    ) {
      return null
    }
    return {
      workspaceSlug: parsed.workspaceSlug,
      viewer: {
        id: viewer.id,
        displayName: viewer.displayName,
        email: typeof viewer.email === 'string' ? viewer.email : null
      }
    }
  } catch {
    return null
  }
}

/** The saved connection, or null when absent or its key file is gone. */
export function getPlaneConnection(): PlaneWorkspaceConnection | null {
  const connection = connectionFileCache.get()
  return connection && tokenFileCache.has(connection.workspaceSlug) ? connection : null
}

export function readPlaneApiKey(workspaceSlug: string): string | null {
  return tokenFileCache.read(workspaceSlug)
}

export function getPlaneCredentialError(workspaceSlug: string): string | undefined {
  return tokenFileCache.error(workspaceSlug)
}

export function getPlaneKeyProtection(workspaceSlug: string): SecretAtRestProtection | null {
  return readCredentialFileProtection(getTokenPath(workspaceSlug))
}

export function savePlaneConnection(connection: PlaneWorkspaceConnection, apiKey: string): void {
  mkdirSync(getTokenDir(), { recursive: true })
  writeEncryptedCredential('Plane', getTokenPath(connection.workspaceSlug), apiKey)
  tokenFileCache.forget(connection.workspaceSlug)
  writeFileSync(getConnectionFilePath(), JSON.stringify(connection, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
  connectionFileCache.invalidate()
}

export function deletePlaneConnection(): void {
  const connection = connectionFileCache.get()
  if (connection) {
    tokenFileCache.forget(connection.workspaceSlug)
    try {
      unlinkSync(getTokenPath(connection.workspaceSlug))
    } catch {}
  }
  try {
    unlinkSync(getConnectionFilePath())
  } catch {}
  connectionFileCache.invalidate()
}
