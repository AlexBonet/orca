import { mapSettledWithConcurrency } from '../../shared/map-with-concurrency'
import { asPlaneRecord } from '../../shared/plane/plane-json'
import type {
  PlaneBoard,
  PlaneCycle,
  PlaneLabel,
  PlaneProject
} from '../../shared/plane/plane-types'
import { toPlaneCycle, toPlaneLabel } from './plane-issue-mapping'
import { PLANE_BOARD_ISSUE_LIMIT, fetchPages, listPlaneIssues } from './plane-issues'
import { listPlaneStates } from './plane-project-metadata'

const CYCLE_REQUEST_CONCURRENCY = 4
const METADATA_LIMIT = 250

function projectPath(workspaceSlug: string, projectId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}`
}

export async function listPlaneLabels(
  apiKey: string,
  workspaceSlug: string,
  projectId: string,
  signal?: AbortSignal
): Promise<PlaneLabel[]> {
  const raw = await fetchPages(
    apiKey,
    `${projectPath(workspaceSlug, projectId)}/labels/`,
    {},
    METADATA_LIMIT,
    signal
  )
  return raw.flatMap((entry) => {
    const label = toPlaneLabel(entry)
    return label ? [label] : []
  })
}

export async function listPlaneCycles(
  apiKey: string,
  workspaceSlug: string,
  projectId: string,
  signal?: AbortSignal
): Promise<PlaneCycle[]> {
  const raw = await fetchPages(
    apiKey,
    `${projectPath(workspaceSlug, projectId)}/cycles/`,
    {},
    METADATA_LIMIT,
    signal
  )
  return raw.flatMap((entry) => {
    const cycle = toPlaneCycle(entry)
    return cycle ? [cycle] : []
  })
}

/** Cycle membership rows carry the work item id in `issue`; some revisions return the item itself. */
function cycleRowIssueId(row: unknown): string {
  const record = asPlaneRecord(row)
  const issue = record?.issue
  if (typeof issue === 'string') {
    return issue
  }
  return typeof record?.id === 'string' ? record.id : ''
}

async function listCycleIssueIds(
  apiKey: string,
  workspaceSlug: string,
  projectId: string,
  cycleId: string,
  signal?: AbortSignal
): Promise<string[]> {
  const raw = await fetchPages(
    apiKey,
    `${projectPath(workspaceSlug, projectId)}/cycles/${encodeURIComponent(cycleId)}/cycle-issues/`,
    {},
    PLANE_BOARD_ISSUE_LIMIT,
    signal
  )
  return raw.map(cycleRowIssueId).filter(Boolean)
}

export async function mapPlaneCycleMembership(
  apiKey: string,
  workspaceSlug: string,
  projectId: string,
  cycles: PlaneCycle[],
  signal?: AbortSignal
): Promise<Record<string, string>> {
  const settled = await mapSettledWithConcurrency(cycles, CYCLE_REQUEST_CONCURRENCY, (cycle) =>
    listCycleIssueIds(apiKey, workspaceSlug, projectId, cycle.id, signal)
  )
  const byIssueId: Record<string, string> = {}
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      for (const issueId of result.value) {
        byIssueId[issueId] = cycles[index].id
      }
    }
  })
  return byIssueId
}

/** Labels and cycles are optional per project; a project that disables them still gets a board. */
async function optional<T>(read: Promise<T[]>): Promise<T[]> {
  try {
    return await read
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    return []
  }
}

export async function getPlaneBoard(
  apiKey: string,
  workspaceSlug: string,
  viewerId: string,
  project: PlaneProject,
  signal?: AbortSignal
): Promise<PlaneBoard> {
  const [states, labels, cycles, issues] = await Promise.all([
    listPlaneStates(apiKey, workspaceSlug, project.id),
    optional(listPlaneLabels(apiKey, workspaceSlug, project.id, signal)),
    optional(listPlaneCycles(apiKey, workspaceSlug, project.id, signal)),
    listPlaneIssues(
      apiKey,
      workspaceSlug,
      viewerId,
      { filter: 'all', projectId: project.id, limit: PLANE_BOARD_ISSUE_LIMIT },
      signal
    )
  ])
  const cycleByIssueId = await mapPlaneCycleMembership(
    apiKey,
    workspaceSlug,
    project.id,
    cycles,
    signal
  )
  return {
    states,
    labels,
    cycles,
    issues,
    cycleByIssueId,
    truncated: issues.length >= PLANE_BOARD_ISSUE_LIMIT
  }
}
