import { mapSettledWithConcurrency } from '../../shared/map-with-concurrency'
import { asPlaneRecord } from '../../shared/plane/plane-json'
import { normalizePlaneIssueKey } from '../../shared/plane/plane-issue-url'
import type {
  PlaneComment,
  PlaneIssue,
  PlaneIssueFilter,
  PlaneIssueSummary,
  PlaneProject
} from '../../shared/plane/plane-types'
import { PlaneApiError, planeRequest } from './plane-request'
import {
  toPlaneComment,
  toPlaneIssue,
  toPlaneIssueSummary,
  toPlaneProject
} from './plane-issue-mapping'

const PAGE_SIZE = 100
const MAX_PAGES_SINGLE_PROJECT = 5
// Plane rate-limits per API key, so a workspace-wide list reads one page per project.
const MAX_PAGES_ALL_PROJECTS = 1
const PROJECT_REQUEST_CONCURRENCY = 4
const DEFAULT_ISSUE_LIMIT = 100
const MAX_ISSUE_LIMIT = 250
export const PLANE_BOARD_ISSUE_LIMIT = MAX_PAGES_SINGLE_PROJECT * PAGE_SIZE
const EXPAND = 'state,assignees,labels'

type PlanePage = {
  results?: unknown[]
  data?: unknown[]
  next_cursor?: string
  next_page_results?: boolean
  has_more?: boolean
}

function pageItems(page: PlanePage): unknown[] {
  return page.results ?? page.data ?? []
}

export async function fetchPages(
  apiKey: string,
  path: string,
  params: Record<string, string | number | undefined>,
  maxItems: number,
  signal?: AbortSignal,
  maxPages = MAX_PAGES_SINGLE_PROJECT
): Promise<unknown[]> {
  const items: unknown[] = []
  let cursor: string | undefined
  for (let pageIndex = 0; pageIndex < maxPages && items.length < maxItems; pageIndex++) {
    const page = await planeRequest<PlanePage>(
      apiKey,
      path,
      { ...params, per_page: PAGE_SIZE, cursor },
      signal
    )
    items.push(...pageItems(page))
    const hasMore = page.next_page_results ?? page.has_more ?? false
    if (!hasMore || !page.next_cursor) {
      break
    }
    cursor = page.next_cursor
  }
  return items.slice(0, maxItems)
}

export function clampPlaneIssueLimit(limit: unknown, max = MAX_ISSUE_LIMIT): number {
  return typeof limit === 'number' && Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), max)
    : DEFAULT_ISSUE_LIMIT
}

export async function listPlaneProjects(
  apiKey: string,
  workspaceSlug: string,
  signal?: AbortSignal
): Promise<PlaneProject[]> {
  const raw = await fetchPages(
    apiKey,
    `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/`,
    {},
    MAX_ISSUE_LIMIT,
    signal
  )
  return raw.map(toPlaneProject).filter((project): project is PlaneProject => project !== null)
}

function matchesFilter(
  issue: PlaneIssueSummary,
  raw: unknown,
  filter: PlaneIssueFilter,
  viewerId: string
): boolean {
  switch (filter) {
    case 'assigned':
      return issue.assigneeIds.includes(viewerId)
    case 'created':
      return asPlaneRecord(raw)?.created_by === viewerId
    case 'open':
      return issue.stateGroup !== 'completed' && issue.stateGroup !== 'cancelled'
    case 'all':
      return true
  }
}

export async function listPlaneIssues(
  apiKey: string,
  workspaceSlug: string,
  viewerId: string,
  args: { filter?: PlaneIssueFilter; projectId?: string; limit?: number },
  signal?: AbortSignal
): Promise<PlaneIssueSummary[]> {
  const filter = args.filter ?? 'open'
  const limit = clampPlaneIssueLimit(
    args.limit,
    args.projectId ? PLANE_BOARD_ISSUE_LIMIT : MAX_ISSUE_LIMIT
  )
  const projects = (await listPlaneProjects(apiKey, workspaceSlug, signal)).filter(
    (project) => !args.projectId || project.id === args.projectId
  )
  const maxPages = args.projectId ? MAX_PAGES_SINGLE_PROJECT : MAX_PAGES_ALL_PROJECTS
  const settled = await mapSettledWithConcurrency(
    projects,
    PROJECT_REQUEST_CONCURRENCY,
    async (project) => {
      const raw = await fetchPages(
        apiKey,
        `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(project.id)}/work-items/`,
        { expand: EXPAND, order_by: '-updated_at' },
        PAGE_SIZE * maxPages,
        signal,
        maxPages
      )
      return raw.flatMap((entry) => {
        const issue = toPlaneIssueSummary(entry, workspaceSlug, project)
        return issue && matchesFilter(issue, entry, filter, viewerId) ? [issue] : []
      })
    }
  )
  const failed = settled.filter((result) => result.status === 'rejected')
  // One inaccessible project must not hide the rest; fail only when nothing could be read.
  if (failed.length > 0 && failed.length === settled.length) {
    throw failed[0].reason
  }
  const perProject = settled.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  )
  return perProject
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
}

async function requestIssueByKey(
  apiKey: string,
  workspaceSlug: string,
  key: string,
  signal?: AbortSignal
): Promise<unknown> {
  const base = `/workspaces/${encodeURIComponent(workspaceSlug)}`
  try {
    return await planeRequest(apiKey, `${base}/work-items/${key}/`, { expand: EXPAND }, signal)
  } catch (error) {
    // Older API revisions only expose the legacy `issues` path.
    if (error instanceof PlaneApiError && error.status === 404) {
      return planeRequest(apiKey, `${base}/issues/${key}/`, { expand: EXPAND }, signal)
    }
    throw error
  }
}

export async function getPlaneIssue(
  apiKey: string,
  workspaceSlug: string,
  rawKey: string,
  signal?: AbortSignal
): Promise<PlaneIssue> {
  const key = normalizePlaneIssueKey(rawKey)
  if (!key) {
    throw new PlaneApiError('Enter a Plane work item key such as PROJ-142.', null)
  }
  const raw = await requestIssueByKey(apiKey, workspaceSlug, key, signal)
  const projects = await listPlaneProjects(apiKey, workspaceSlug, signal)
  const project = projects.find((entry) => entry.identifier === key.split('-')[0])
  const issue = project ? toPlaneIssue(raw, workspaceSlug, project) : null
  if (!issue) {
    throw new PlaneApiError(`Plane work item ${key} was not found.`, 404)
  }
  return issue
}

export async function getPlaneIssueComments(
  apiKey: string,
  workspaceSlug: string,
  issue: { id: string; projectId: string },
  signal?: AbortSignal
): Promise<PlaneComment[]> {
  const raw = await fetchPages(
    apiKey,
    `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(issue.projectId)}/work-items/${encodeURIComponent(issue.id)}/comments/`,
    { order_by: 'created_at' },
    MAX_ISSUE_LIMIT,
    signal
  )
  return raw.map(toPlaneComment).filter((comment): comment is PlaneComment => comment !== null)
}
