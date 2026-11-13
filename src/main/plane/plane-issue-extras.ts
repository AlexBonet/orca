import { asPlaneRecord } from '../../shared/plane/plane-json'
import {
  PLANE_RELATION_TYPES,
  type PlaneIssue,
  type PlaneIssueExtras,
  type PlaneIssueRelation,
  type PlaneIssueSummary,
  type PlaneRelationType
} from '../../shared/plane/plane-types'
import { listPlaneCycles, listPlaneLabels, mapPlaneCycleMembership } from './plane-board'
import { PLANE_BOARD_ISSUE_LIMIT, listPlaneIssues } from './plane-issues'
import { planeRequest } from './plane-request'

const PROJECT_ISSUES_TTL_MS = 20_000

const projectReadCache = new Map<string, { at: number; value: Promise<unknown> }>()

/** Writes change sub-issue, relation and cycle views, so they drop every cached project read. */
export function invalidatePlaneProjectIssues(): void {
  projectReadCache.clear()
}

function cachedProjectRead<T>(cacheKey: string, read: () => Promise<T>): Promise<T> {
  const hit = projectReadCache.get(cacheKey)
  if (hit && Date.now() - hit.at < PROJECT_ISSUES_TTL_MS) {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: each cache key is only ever written with one value type.
    return hit.value as Promise<T>
  }
  const value = read()
  projectReadCache.set(cacheKey, { at: Date.now(), value })
  value.catch(() => projectReadCache.delete(cacheKey))
  return value
}

function cachedProjectIssues(
  apiKey: string,
  workspaceSlug: string,
  viewerId: string,
  projectId: string
): Promise<PlaneIssueSummary[]> {
  return cachedProjectRead(`issues/${workspaceSlug}/${projectId}`, () =>
    listPlaneIssues(apiKey, workspaceSlug, viewerId, {
      filter: 'all',
      projectId,
      limit: PLANE_BOARD_ISSUE_LIMIT
    })
  )
}

/** Labels and cycles are optional per project; a project that disables them still gets a detail view. */
async function optionalList<T>(read: Promise<T[]>): Promise<T[]> {
  return read.catch(() => [])
}

function cachedProjectCycles(apiKey: string, workspaceSlug: string, projectId: string) {
  return cachedProjectRead(`cycles/${workspaceSlug}/${projectId}`, async () => {
    const cycles = await optionalList(listPlaneCycles(apiKey, workspaceSlug, projectId))
    const membership = await mapPlaneCycleMembership(apiKey, workspaceSlug, projectId, cycles)
    return { cycles, membership }
  })
}

function relationIds(raw: Record<string, unknown> | null, type: PlaneRelationType): string[] {
  const value = raw?.[type]
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (typeof entry === 'string') {
          return [entry]
        }
        const id = asPlaneRecord(entry)?.id
        return typeof id === 'string' ? [id] : []
      })
    : []
}

export async function getPlaneIssueExtras(
  apiKey: string,
  workspaceSlug: string,
  viewerId: string,
  issue: PlaneIssue
): Promise<PlaneIssueExtras> {
  const [projectIssues, cycleData, labels, relationsRaw] = await Promise.all([
    cachedProjectIssues(apiKey, workspaceSlug, viewerId, issue.projectId),
    cachedProjectCycles(apiKey, workspaceSlug, issue.projectId),
    cachedProjectRead(`labels/${workspaceSlug}/${issue.projectId}`, () =>
      optionalList(listPlaneLabels(apiKey, workspaceSlug, issue.projectId))
    ),
    // A project without relations enabled answers an error; the detail view still works.
    planeRequest<unknown>(
      apiKey,
      `/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(issue.projectId)}/work-items/${encodeURIComponent(issue.id)}/relations/`
    ).catch(() => null)
  ])
  const byId = new Map(projectIssues.map((entry) => [entry.id, entry]))
  const record = asPlaneRecord(relationsRaw)
  let unresolvedRelationCount = 0
  const relations: PlaneIssueRelation[] = []
  for (const type of PLANE_RELATION_TYPES) {
    const resolved: PlaneIssueSummary[] = []
    for (const id of relationIds(record, type)) {
      const related = byId.get(id)
      if (related) {
        resolved.push(related)
      } else {
        unresolvedRelationCount++
      }
    }
    if (resolved.length > 0) {
      relations.push({ type, issues: resolved })
    }
  }
  return {
    labels,
    cycles: cycleData.cycles,
    cycleId: cycleData.membership[issue.id] ?? null,
    relations,
    subIssues: projectIssues.filter((entry) => entry.parentId === issue.id),
    unresolvedRelationCount
  }
}
