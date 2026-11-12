import { normalizePlaneWorkspaceSlug } from '../../shared/plane/plane-issue-url'
import type {
  PlaneAgentWritePolicy,
  PlaneBoard,
  PlaneComment,
  PlaneIssueExtras,
  PlaneSetRelationArgs,
  PlaneConnectArgs,
  PlaneConnectionStatus,
  PlaneIssue,
  PlaneIssueSummary,
  PlaneCreateIssueArgs,
  PlaneIssueUpdate,
  PlaneListIssuesArgs,
  PlaneMember,
  PlaneProject,
  PlaneState,
  PlaneResult,
  PlaneViewer
} from '../../shared/plane/plane-types'
import {
  deletePlaneConnection,
  getPlaneConnection,
  getPlaneCredentialError,
  getPlaneKeyProtection,
  readPlaneApiKey,
  savePlaneConnection
} from './plane-credential-store'
import {
  getPlaneIssue,
  getPlaneIssueComments,
  listPlaneIssues,
  listPlaneProjects
} from './plane-issues'
import { getPlaneAgentWritePolicy, setPlaneAgentWritePolicy } from './plane-agent-write-policy'
import { getPlaneBoard } from './plane-board'
import { getPlaneIssueExtras } from './plane-issue-extras'
import { toPlaneViewer } from './plane-issue-mapping'
import {
  addPlaneIssueComment,
  createPlaneIssue,
  setPlaneIssueRelation,
  updatePlaneIssue
} from './plane-issue-mutations'
import { listPlaneMembers, listPlaneStates } from './plane-project-metadata'
import { PlaneApiError, planeRequest } from './plane-request'

type ActiveSession = { apiKey: string; workspaceSlug: string; viewer: PlaneViewer }

const NOT_CONNECTED = 'Not connected to Plane.'

function failure(error: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'Plane request failed.'
  }
}

function activeSession(): ActiveSession | null {
  const connection = getPlaneConnection()
  if (!connection) {
    return null
  }
  const apiKey = readPlaneApiKey(connection.workspaceSlug)
  return apiKey ? { apiKey, ...connection } : null
}

async function withSession<T>(
  run: (session: ActiveSession) => Promise<T>
): Promise<PlaneResult<{ value: T }>> {
  try {
    const session = activeSession()
    if (!session) {
      return { ok: false, error: NOT_CONNECTED }
    }
    return { ok: true, value: await run(session) }
  } catch (error) {
    return failure(error)
  }
}

export function getPlaneStatus(): PlaneConnectionStatus {
  const connection = getPlaneConnection()
  return {
    connected: connection !== null,
    workspaceSlug: connection?.workspaceSlug ?? null,
    viewer: connection?.viewer ?? null,
    ...(connection && getPlaneCredentialError(connection.workspaceSlug)
      ? { credentialError: getPlaneCredentialError(connection.workspaceSlug) }
      : {}),
    agentWritePolicy: getPlaneAgentWritePolicy(),
    credentialProtection:
      connection && getPlaneKeyProtection(connection.workspaceSlug) === 'plaintext'
        ? 'plaintext'
        : null
  }
}

async function verifyCredentials(apiKey: string, workspaceSlug: string): Promise<PlaneViewer> {
  const viewer = toPlaneViewer(await planeRequest(apiKey, '/users/me/'))
  if (!viewer) {
    throw new PlaneApiError('Plane returned an unexpected profile response.', null)
  }
  // Fails with a workspace-specific 404/403 when the key cannot see this workspace.
  await listPlaneProjects(apiKey, workspaceSlug)
  return viewer
}

export async function connectPlane(
  args: PlaneConnectArgs
): Promise<PlaneResult<{ viewer: PlaneViewer }>> {
  const workspaceSlug = normalizePlaneWorkspaceSlug(args.workspaceSlug)
  if (!workspaceSlug) {
    return { ok: false, error: 'Enter the workspace slug from your Plane URL.' }
  }
  const apiKey = args.apiKey.trim()
  if (!apiKey) {
    return { ok: false, error: 'API key is required.' }
  }
  try {
    const viewer = await verifyCredentials(apiKey, workspaceSlug)
    const previous = getPlaneConnection()
    if (previous && previous.workspaceSlug !== workspaceSlug) {
      deletePlaneConnection()
    }
    savePlaneConnection({ workspaceSlug, viewer }, apiKey)
    return { ok: true, viewer }
  } catch (error) {
    return failure(error)
  }
}

export function setPlaneAgentWritePolicyValue(policy: PlaneAgentWritePolicy): void {
  setPlaneAgentWritePolicy(policy)
}

export function disconnectPlane(): void {
  deletePlaneConnection()
}

export async function testPlaneConnection(): Promise<PlaneResult<{ viewer: PlaneViewer }>> {
  const result = await withSession((session) =>
    verifyCredentials(session.apiKey, session.workspaceSlug)
  )
  return result.ok ? { ok: true, viewer: result.value } : result
}

export async function listPlaneProjectsForActiveWorkspace(): Promise<
  PlaneResult<{ projects: PlaneProject[] }>
> {
  const result = await withSession((session) =>
    listPlaneProjects(session.apiKey, session.workspaceSlug)
  )
  return result.ok ? { ok: true, projects: result.value } : result
}

export async function listPlaneIssuesForActiveWorkspace(
  args: PlaneListIssuesArgs,
  signal?: AbortSignal
): Promise<PlaneResult<{ issues: PlaneIssueSummary[] }>> {
  const result = await withSession((session) =>
    listPlaneIssues(session.apiKey, session.workspaceSlug, session.viewer.id, args, signal)
  )
  return result.ok ? { ok: true, issues: result.value } : result
}

export async function getPlaneIssueForActiveWorkspace(
  key: string
): Promise<PlaneResult<{ issue: PlaneIssue }>> {
  const result = await withSession((session) =>
    getPlaneIssue(session.apiKey, session.workspaceSlug, key)
  )
  return result.ok ? { ok: true, issue: result.value } : result
}

export async function getPlaneIssueCommentsForActiveWorkspace(
  key: string
): Promise<PlaneResult<{ comments: PlaneComment[] }>> {
  const result = await withSession(async (session) => {
    const issue = await getPlaneIssue(session.apiKey, session.workspaceSlug, key)
    return getPlaneIssueComments(session.apiKey, session.workspaceSlug, issue)
  })
  return result.ok ? { ok: true, comments: result.value } : result
}

export async function listPlaneStatesForActiveWorkspace(
  projectId: string
): Promise<PlaneResult<{ states: PlaneState[] }>> {
  const result = await withSession((session) =>
    listPlaneStates(session.apiKey, session.workspaceSlug, projectId)
  )
  return result.ok ? { ok: true, states: result.value } : result
}

export async function listPlaneMembersForActiveWorkspace(
  projectId: string
): Promise<PlaneResult<{ members: PlaneMember[] }>> {
  const result = await withSession((session) =>
    listPlaneMembers(session.apiKey, session.workspaceSlug, projectId)
  )
  return result.ok ? { ok: true, members: result.value } : result
}

export async function updatePlaneIssueForActiveWorkspace(
  key: string,
  update: PlaneIssueUpdate
): Promise<PlaneResult<object>> {
  const result = await withSession(async (session) => {
    const issue = await getPlaneIssue(session.apiKey, session.workspaceSlug, key)
    await updatePlaneIssue(session.apiKey, session.workspaceSlug, issue, update)
  })
  return result.ok ? { ok: true } : result
}

export async function addPlaneIssueCommentForActiveWorkspace(
  key: string,
  body: string
): Promise<PlaneResult<object>> {
  const result = await withSession(async (session) => {
    const issue = await getPlaneIssue(session.apiKey, session.workspaceSlug, key)
    await addPlaneIssueComment(session.apiKey, session.workspaceSlug, issue, body)
  })
  return result.ok ? { ok: true } : result
}

export async function createPlaneIssueForActiveWorkspace(
  args: PlaneCreateIssueArgs
): Promise<PlaneResult<{ key: string }>> {
  const result = await withSession(async (session) => {
    const created = await createPlaneIssue(session.apiKey, session.workspaceSlug, args)
    const projects = await listPlaneProjects(session.apiKey, session.workspaceSlug)
    const project = projects.find((entry) => entry.id === args.projectId)
    return project ? `${project.identifier}-${created.sequenceId}` : String(created.sequenceId)
  })
  return result.ok ? { ok: true, key: result.value } : result
}

export async function getPlaneBoardForActiveWorkspace(
  projectId: string,
  signal?: AbortSignal
): Promise<PlaneResult<{ board: PlaneBoard }>> {
  const result = await withSession(async (session) => {
    const projects = await listPlaneProjects(session.apiKey, session.workspaceSlug, signal)
    const project = projects.find((entry) => entry.id === projectId)
    if (!project) {
      throw new PlaneApiError('Plane project was not found.', 404)
    }
    return getPlaneBoard(session.apiKey, session.workspaceSlug, session.viewer.id, project, signal)
  })
  return result.ok ? { ok: true, board: result.value } : result
}

export async function getPlaneIssueExtrasForActiveWorkspace(
  key: string
): Promise<PlaneResult<{ extras: PlaneIssueExtras }>> {
  const result = await withSession(async (session) => {
    const issue = await getPlaneIssue(session.apiKey, session.workspaceSlug, key)
    return getPlaneIssueExtras(session.apiKey, session.workspaceSlug, session.viewer.id, issue)
  })
  return result.ok ? { ok: true, extras: result.value } : result
}

export async function setPlaneIssueRelationForActiveWorkspace(
  args: PlaneSetRelationArgs
): Promise<PlaneResult<object>> {
  const result = await withSession(async (session) => {
    const issue = await getPlaneIssue(session.apiKey, session.workspaceSlug, args.key)
    const related = await getPlaneIssue(session.apiKey, session.workspaceSlug, args.relatedKey)
    await setPlaneIssueRelation(
      session.apiKey,
      session.workspaceSlug,
      issue,
      related.id,
      args.type,
      args.remove === true
    )
  })
  return result.ok ? { ok: true } : result
}
