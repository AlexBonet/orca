import type {
  PlaneCycle,
  PlaneLabel,
  PlaneMember,
  PlaneProject,
  PlaneResult,
  PlaneState
} from '../shared/plane/plane-types'
import type { HandlerContext } from './dispatch'
import { RuntimeClientError, type RuntimeRpcSuccess } from './runtime-client'

type PlaneClient = HandlerContext['client']

/** Unwraps a PlaneResult so a failed Plane call surfaces as a CLI error. */
export async function callPlane<T extends object>(
  client: PlaneClient,
  method: string,
  params?: unknown
): Promise<{ response: RuntimeRpcSuccess<PlaneResult<T>>; value: T }> {
  const response = await client.call<PlaneResult<T>>(`plane.${method}`, params)
  if (!response.result.ok) {
    throw new RuntimeClientError('plane_error', response.result.error)
  }
  return { response, value: response.result }
}

function pick<T>(items: T[], input: string, names: (item: T) => string[], kind: string): T {
  const wanted = input.trim().toLowerCase()
  const match = items.find((item) => names(item).some((name) => name.toLowerCase() === wanted))
  if (match) {
    return match
  }
  const available = items.map((item) => names(item)[0]).join(', ')
  throw new RuntimeClientError(
    'invalid_argument',
    `Unknown ${kind} "${input}". Available: ${available || 'none'}.`
  )
}

export async function resolveProject(client: PlaneClient, input: string): Promise<PlaneProject> {
  const { value } = await callPlane<{ projects: PlaneProject[] }>(client, 'listProjects')
  return pick(value.projects, input, (p) => [p.identifier, p.id, p.name], 'project')
}

export async function resolveState(
  client: PlaneClient,
  projectId: string,
  input: string
): Promise<PlaneState> {
  const { value } = await callPlane<{ states: PlaneState[] }>(client, 'listStates', { projectId })
  return pick(value.states, input, (s) => [s.name, s.id], 'status')
}

export async function resolveAssigneeIds(
  client: PlaneClient,
  projectId: string,
  input: string
): Promise<string[]> {
  if (input.trim().toLowerCase() === 'none') {
    return []
  }
  if (input.trim().toLowerCase() === 'me') {
    const status = await client.call<{ viewer: { id: string } | null }>('plane.status')
    if (!status.result.viewer) {
      throw new RuntimeClientError('plane_error', 'Not connected to Plane.')
    }
    return [status.result.viewer.id]
  }
  const { value } = await callPlane<{ members: PlaneMember[] }>(client, 'listMembers', {
    projectId
  })
  return [pick(value.members, input, (m) => [m.displayName, m.id], 'assignee').id]
}

export function resolveLabelIds(labels: PlaneLabel[], input: string): string[] {
  if (input.trim().toLowerCase() === 'none') {
    return []
  }
  return input
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => pick(labels, name, (l) => [l.name, l.id], 'label').id)
}

export function resolveCycleId(cycles: PlaneCycle[], input: string): string | null {
  return input.trim().toLowerCase() === 'none'
    ? null
    : pick(cycles, input, (c) => [c.name, c.id], 'cycle').id
}
