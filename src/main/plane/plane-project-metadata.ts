import { asPlaneRecord } from '../../shared/plane/plane-json'
import type { PlaneMember, PlaneState, PlaneStateGroup } from '../../shared/plane/plane-types'
import { planeRequest } from './plane-request'

const STATE_GROUPS: readonly PlaneStateGroup[] = [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled'
]

type PlaneList = { results?: unknown[]; data?: unknown[] }

function projectPath(workspaceSlug: string, projectId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}`
}

export async function listPlaneStates(
  apiKey: string,
  workspaceSlug: string,
  projectId: string
): Promise<PlaneState[]> {
  const page = await planeRequest<PlaneList | unknown[]>(
    apiKey,
    `${projectPath(workspaceSlug, projectId)}/states/`,
    { per_page: 100 }
  )
  const rows = Array.isArray(page) ? page : (page.results ?? page.data ?? [])
  return rows.flatMap((row) => {
    const record = asPlaneRecord(row)
    const id = typeof record?.id === 'string' ? record.id : ''
    if (!record || !id) {
      return []
    }
    const group = STATE_GROUPS.find((candidate) => candidate === record.group) ?? null
    return [{ id, name: typeof record.name === 'string' ? record.name : id, group }]
  })
}

function memberFromRecord(record: Record<string, unknown> | null): PlaneMember[] {
  // v1 returns the user flat; newer revisions nest it under `member`.
  const user = asPlaneRecord(record?.member) ?? record
  const id = typeof user?.id === 'string' ? user.id : ''
  if (!user || !id) {
    return []
  }
  const displayName =
    (typeof user.display_name === 'string' && user.display_name) ||
    (typeof user.first_name === 'string' && user.first_name) ||
    (typeof user.email === 'string' && user.email) ||
    id
  return [{ id, displayName }]
}

export async function listPlaneMembers(
  apiKey: string,
  workspaceSlug: string,
  projectId: string
): Promise<PlaneMember[]> {
  const page = await planeRequest<PlaneList | unknown[]>(
    apiKey,
    `${projectPath(workspaceSlug, projectId)}/project-members/`
  )
  const rows = Array.isArray(page) ? page : (page.results ?? page.data ?? [])
  // Some responses wrap the roster in an extra array.
  return rows
    .flatMap((row) => (Array.isArray(row) ? row : [row]))
    .flatMap((row) => memberFromRecord(asPlaneRecord(row)))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
