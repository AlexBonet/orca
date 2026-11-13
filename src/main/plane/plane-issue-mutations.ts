import { planeTextToHtml } from '../../shared/plane/plane-text-html'
import type {
  PlaneCreateIssueArgs,
  PlaneIssueUpdate,
  PlaneRelationType
} from '../../shared/plane/plane-types'
import { listPlaneCycles, mapPlaneCycleMembership } from './plane-board'
import { invalidatePlaneProjectIssues } from './plane-issue-extras'
import { PlaneApiError, planeRequest } from './plane-request'

type IssueRef = { id: string; projectId: string }

function issuePath(workspaceSlug: string, projectId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/work-items/`
}

function cycleIssuesPath(workspaceSlug: string, projectId: string, cycleId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/cycles/${encodeURIComponent(cycleId)}/cycle-issues/`
}

async function setIssueCycle(
  apiKey: string,
  workspaceSlug: string,
  issue: IssueRef,
  cycleId: string | null
): Promise<void> {
  if (cycleId) {
    await planeRequest(
      apiKey,
      cycleIssuesPath(workspaceSlug, issue.projectId, cycleId),
      undefined,
      undefined,
      { method: 'POST', json: { issues: [issue.id] } }
    )
    return
  }
  const cycles = await listPlaneCycles(apiKey, workspaceSlug, issue.projectId)
  const membership = await mapPlaneCycleMembership(apiKey, workspaceSlug, issue.projectId, cycles)
  const current = membership[issue.id]
  if (current) {
    await planeRequest(
      apiKey,
      `${cycleIssuesPath(workspaceSlug, issue.projectId, current)}${encodeURIComponent(issue.id)}/`,
      undefined,
      undefined,
      { method: 'DELETE' }
    )
  }
}

export async function setPlaneIssueRelation(
  apiKey: string,
  workspaceSlug: string,
  issue: IssueRef,
  relatedIssueId: string,
  type: PlaneRelationType,
  remove: boolean
): Promise<void> {
  const base = `${issuePath(workspaceSlug, issue.projectId)}${encodeURIComponent(issue.id)}/relations/`
  await planeRequest(apiKey, remove ? `${base}remove/` : base, undefined, undefined, {
    method: 'POST',
    json: remove
      ? { related_issue: relatedIssueId }
      : { relation_type: type, issues: [relatedIssueId] }
  })
  invalidatePlaneProjectIssues()
}

export async function updatePlaneIssue(
  apiKey: string,
  workspaceSlug: string,
  issue: IssueRef,
  update: PlaneIssueUpdate
): Promise<void> {
  const json = {
    ...(update.title !== undefined ? { name: update.title } : {}),
    ...(update.stateId !== undefined ? { state: update.stateId } : {}),
    ...(update.assigneeIds !== undefined ? { assignees: update.assigneeIds } : {}),
    ...(update.priority !== undefined ? { priority: update.priority } : {}),
    ...(update.labelIds !== undefined ? { labels: update.labelIds } : {}),
    ...(update.startDate !== undefined ? { start_date: update.startDate } : {}),
    ...(update.targetDate !== undefined ? { target_date: update.targetDate } : {}),
    ...(update.parentId !== undefined ? { parent: update.parentId } : {})
  }
  if (Object.keys(json).length === 0 && update.cycleId === undefined) {
    throw new PlaneApiError('Nothing to update.', null)
  }
  if (Object.keys(json).length > 0) {
    await planeRequest(
      apiKey,
      `${issuePath(workspaceSlug, issue.projectId)}${encodeURIComponent(issue.id)}/`,
      undefined,
      undefined,
      { method: 'PATCH', json }
    )
  }
  if (update.cycleId !== undefined) {
    await setIssueCycle(apiKey, workspaceSlug, issue, update.cycleId)
  }
  invalidatePlaneProjectIssues()
}

export async function addPlaneIssueComment(
  apiKey: string,
  workspaceSlug: string,
  issue: IssueRef,
  body: string
): Promise<void> {
  const html = planeTextToHtml(body)
  if (!html) {
    throw new PlaneApiError('Comment cannot be empty.', null)
  }
  await planeRequest(
    apiKey,
    `${issuePath(workspaceSlug, issue.projectId)}${encodeURIComponent(issue.id)}/comments/`,
    undefined,
    undefined,
    { method: 'POST', json: { comment_html: html } }
  )
}

/** Returns the new work item's id and sequence number so callers can derive its key. */
export async function createPlaneIssue(
  apiKey: string,
  workspaceSlug: string,
  args: PlaneCreateIssueArgs
): Promise<{ id: string; sequenceId: number }> {
  const title = args.title.trim()
  if (!title) {
    throw new PlaneApiError('Title is required.', null)
  }
  const created = await planeRequest<{ id?: unknown; sequence_id?: unknown }>(
    apiKey,
    issuePath(workspaceSlug, args.projectId),
    undefined,
    undefined,
    {
      method: 'POST',
      json: {
        name: title,
        ...(args.description?.trim()
          ? { description_html: planeTextToHtml(args.description) }
          : {}),
        ...(args.priority ? { priority: args.priority } : {}),
        ...(args.stateId ? { state: args.stateId } : {}),
        ...(args.labelIds?.length ? { labels: args.labelIds } : {}),
        ...(args.parentId ? { parent: args.parentId } : {})
      }
    }
  )
  if (typeof created.id !== 'string' || typeof created.sequence_id !== 'number') {
    throw new PlaneApiError(
      'Plane created the work item but returned an unexpected response.',
      null
    )
  }
  if (args.cycleId) {
    await setIssueCycle(
      apiKey,
      workspaceSlug,
      { id: created.id, projectId: args.projectId },
      args.cycleId
    )
  }
  invalidatePlaneProjectIssues()
  return { id: created.id, sequenceId: created.sequence_id }
}
