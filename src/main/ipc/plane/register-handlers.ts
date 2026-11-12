import { ipcMain } from 'electron'
import {
  addPlaneIssueCommentForActiveWorkspace,
  connectPlane,
  createPlaneIssueForActiveWorkspace,
  disconnectPlane,
  getPlaneBoardForActiveWorkspace,
  getPlaneIssueCommentsForActiveWorkspace,
  getPlaneIssueExtrasForActiveWorkspace,
  getPlaneIssueForActiveWorkspace,
  getPlaneStatus,
  listPlaneIssuesForActiveWorkspace,
  listPlaneMembersForActiveWorkspace,
  listPlaneProjectsForActiveWorkspace,
  listPlaneStatesForActiveWorkspace,
  setPlaneAgentWritePolicyValue,
  setPlaneIssueRelationForActiveWorkspace,
  testPlaneConnection,
  updatePlaneIssueForActiveWorkspace
} from '../../plane/plane-client'
import { registerElectronPlaneAgentWritePrompt } from '../../host/electron-plane-agent-write-prompt'
import { asPlaneRecord } from '../../../shared/plane/plane-json'
import {
  isPlaneAgentWritePolicy,
  isPlaneIssueFilter,
  isPlanePriority,
  isPlaneRelationType,
  type PlaneCreateIssueArgs,
  type PlaneIssueUpdate,
  type PlaneListIssuesArgs,
  type PlanePriority
} from '../../../shared/plane/plane-types'

function readKey(args: unknown): string | null {
  const key = asPlaneRecord(args)?.key
  return typeof key === 'string' && key.trim() ? key : null
}

const MAX_LABELS = 50
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_TEXT_LENGTH = 20_000
const MAX_ASSIGNEES = 20
const FAILURE_NO_KEY = { ok: false, error: 'Work item key is required.' } as const

function readText(value: unknown, max = MAX_TEXT_LENGTH): string | null {
  return typeof value === 'string' && value.length <= max ? value : null
}

function readPriority(value: unknown): PlanePriority | undefined {
  return isPlanePriority(value) ? value : undefined
}

function readUpdate(raw: unknown): PlaneIssueUpdate | null {
  const input = asPlaneRecord(raw) ?? {}
  const update: PlaneIssueUpdate = {}
  if (input.title !== undefined) {
    const title = readText(input.title, 255)?.trim()
    if (!title) {
      return null
    }
    update.title = title
  }
  if (input.stateId !== undefined) {
    const stateId = readText(input.stateId, 64)
    if (!stateId) {
      return null
    }
    update.stateId = stateId
  }
  if (input.assigneeIds !== undefined) {
    const ids = input.assigneeIds
    if (
      !Array.isArray(ids) ||
      ids.length > MAX_ASSIGNEES ||
      !ids.every((id) => typeof id === 'string' && id.length <= 64)
    ) {
      return null
    }
    update.assigneeIds = ids
  }
  if (input.priority !== undefined) {
    update.priority = readPriority(input.priority)
    if (!update.priority) {
      return null
    }
  }
  if (!readExtendedUpdate(input, update)) {
    return null
  }
  return Object.keys(update).length > 0 ? update : null
}

function readLabelIds(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.length <= MAX_LABELS &&
    value.every((id) => typeof id === 'string' && id.length <= 64)
    ? value
    : null
}

function readDateOrNull(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return typeof value === 'string' && DATE_PATTERN.test(value) ? value : undefined
}

function readIdOrNull(value: unknown): string | null | undefined {
  return value === null ? null : (readText(value, 64) ?? undefined)
}

/** Returns false when any present field has an invalid value. */
function readExtendedUpdate(input: Record<string, unknown>, update: PlaneIssueUpdate): boolean {
  if (input.labelIds !== undefined) {
    const labelIds = readLabelIds(input.labelIds)
    if (!labelIds) {
      return false
    }
    update.labelIds = labelIds
  }
  for (const field of ['startDate', 'targetDate'] as const) {
    if (input[field] !== undefined) {
      const date = readDateOrNull(input[field])
      if (date === undefined) {
        return false
      }
      update[field] = date
    }
  }
  for (const field of ['parentId', 'cycleId'] as const) {
    if (input[field] !== undefined) {
      const id = readIdOrNull(input[field])
      if (id === undefined) {
        return false
      }
      update[field] = id
    }
  }
  return true
}

export function registerPlaneHandlers(): void {
  registerElectronPlaneAgentWritePrompt()
  ipcMain.handle(
    'plane:connect',
    async (_event, args: { workspaceSlug?: unknown; apiKey?: unknown }) => {
      if (typeof args?.workspaceSlug !== 'string' || typeof args?.apiKey !== 'string') {
        return { ok: false, error: 'Workspace slug and API key are required.' }
      }
      return connectPlane({ workspaceSlug: args.workspaceSlug, apiKey: args.apiKey })
    }
  )

  ipcMain.handle('plane:disconnect', async () => {
    disconnectPlane()
  })

  ipcMain.handle('plane:status', async () => getPlaneStatus())

  ipcMain.handle('plane:testConnection', async () => testPlaneConnection())

  ipcMain.handle('plane:listProjects', async () => listPlaneProjectsForActiveWorkspace())

  ipcMain.handle('plane:listIssues', async (_event, args?: PlaneListIssuesArgs) =>
    listPlaneIssuesForActiveWorkspace({
      filter: isPlaneIssueFilter(args?.filter) ? args.filter : undefined,
      projectId: typeof args?.projectId === 'string' ? args.projectId : undefined,
      limit: args?.limit
    })
  )

  ipcMain.handle('plane:getIssue', async (_event, args: { key?: unknown }) => {
    const key = readKey(args)
    return key
      ? getPlaneIssueForActiveWorkspace(key)
      : { ok: false, error: 'Work item key is required.' }
  })

  ipcMain.handle('plane:issueComments', async (_event, args: { key?: unknown }) => {
    const key = readKey(args)
    return key
      ? getPlaneIssueCommentsForActiveWorkspace(key)
      : { ok: false, error: 'Work item key is required.' }
  })

  ipcMain.handle('plane:listStates', async (_event, args: { projectId?: unknown }) => {
    const projectId = readText(args?.projectId, 64)
    return projectId
      ? listPlaneStatesForActiveWorkspace(projectId)
      : { ok: false, error: 'Project is required.' }
  })

  ipcMain.handle('plane:listMembers', async (_event, args: { projectId?: unknown }) => {
    const projectId = readText(args?.projectId, 64)
    return projectId
      ? listPlaneMembersForActiveWorkspace(projectId)
      : { ok: false, error: 'Project is required.' }
  })

  ipcMain.handle(
    'plane:updateIssue',
    async (_event, args: { key?: unknown; updates?: unknown }) => {
      const key = readKey(args)
      const updates = readUpdate(args?.updates)
      if (!key) {
        return FAILURE_NO_KEY
      }
      return updates
        ? updatePlaneIssueForActiveWorkspace(key, updates)
        : { ok: false, error: 'Invalid work item update.' }
    }
  )

  ipcMain.handle('plane:addComment', async (_event, args: { key?: unknown; body?: unknown }) => {
    const key = readKey(args)
    const body = readText(args?.body)
    if (!key) {
      return FAILURE_NO_KEY
    }
    return body?.trim()
      ? addPlaneIssueCommentForActiveWorkspace(key, body)
      : { ok: false, error: 'Comment cannot be empty.' }
  })

  ipcMain.handle('plane:createIssue', async (_event, args: Partial<PlaneCreateIssueArgs>) => {
    const projectId = readText(args?.projectId, 64)
    const title = readText(args?.title, 255)?.trim()
    if (!projectId || !title) {
      return { ok: false, error: 'Project and title are required.' }
    }
    return createPlaneIssueForActiveWorkspace({
      projectId,
      title,
      description: readText(args?.description) ?? undefined,
      priority: readPriority(args?.priority),
      stateId: readText(args?.stateId, 64) ?? undefined,
      labelIds: readLabelIds(args?.labelIds) ?? undefined,
      parentId: readText(args?.parentId, 64) ?? undefined,
      cycleId: readText(args?.cycleId, 64) ?? undefined
    })
  })

  ipcMain.handle('plane:setAgentWritePolicy', async (_event, args: { policy?: unknown }) => {
    if (!isPlaneAgentWritePolicy(args?.policy)) {
      return { ok: false, error: 'Invalid agent write policy.' }
    }
    setPlaneAgentWritePolicyValue(args.policy)
    return { ok: true }
  })

  ipcMain.handle('plane:getBoard', async (_event, args: { projectId?: unknown }) => {
    const projectId = readText(args?.projectId, 64)
    return projectId
      ? getPlaneBoardForActiveWorkspace(projectId)
      : { ok: false, error: 'Project is required.' }
  })

  ipcMain.handle('plane:issueExtras', async (_event, args: { key?: unknown }) => {
    const key = readKey(args)
    return key ? getPlaneIssueExtrasForActiveWorkspace(key) : FAILURE_NO_KEY
  })

  ipcMain.handle(
    'plane:setRelation',
    async (
      _event,
      args: { key?: unknown; relatedKey?: unknown; type?: unknown; remove?: unknown }
    ) => {
      const key = readKey(args)
      const relatedKey = readKey({ key: args?.relatedKey })
      if (!key || !relatedKey || !isPlaneRelationType(args?.type)) {
        return { ok: false, error: 'Invalid work item relation.' }
      }
      return setPlaneIssueRelationForActiveWorkspace({
        key,
        relatedKey,
        type: args.type,
        remove: args.remove === true
      })
    }
  )
}
