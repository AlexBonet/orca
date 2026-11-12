import type { SecretAtRestProtection } from '../secret-at-rest-protection'

export type PlaneConnectArgs = {
  workspaceSlug: string
  apiKey: string
}

export type PlaneViewer = {
  id: string
  displayName: string
  email: string | null
}

export type PlaneWorkspaceConnection = {
  workspaceSlug: string
  viewer: PlaneViewer
}

export const PLANE_AGENT_WRITE_POLICIES = ['confirm', 'allow', 'deny'] as const

export type PlaneAgentWritePolicy = (typeof PLANE_AGENT_WRITE_POLICIES)[number]

export function isPlaneAgentWritePolicy(value: unknown): value is PlaneAgentWritePolicy {
  return PLANE_AGENT_WRITE_POLICIES.some((policy) => policy === value)
}

export type PlaneConnectionStatus = {
  connected: boolean
  workspaceSlug: string | null
  viewer: PlaneViewer | null
  credentialError?: string
  credentialProtection: SecretAtRestProtection | null
  /** How writes from the agent CLI are handled; the app UI is never gated. */
  agentWritePolicy: PlaneAgentWritePolicy
}

export type PlaneProject = {
  id: string
  identifier: string
  name: string
}

export type PlaneStateGroup = 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'

export type PlaneLabel = {
  id: string
  name: string
  color: string | null
}

export type PlaneCycle = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
}

export type PlaneIssueSummary = {
  id: string
  /** Human key such as `PROJ-142`. */
  key: string
  title: string
  priority: string
  stateId: string
  stateName: string
  stateGroup: PlaneStateGroup | null
  projectId: string
  projectIdentifier: string
  projectName: string
  assigneeIds: string[]
  assigneeNames: string[]
  labels: string[]
  labelItems: PlaneLabel[]
  startDate: string | null
  targetDate: string | null
  parentId: string | null
  subIssueCount: number
  url: string
  createdAt: string
  updatedAt: string
}

export type PlaneIssue = PlaneIssueSummary & {
  descriptionHtml: string
}

export type PlaneComment = {
  id: string
  authorName: string
  bodyHtml: string
  createdAt: string
}

export const PLANE_ISSUE_FILTERS = ['assigned', 'created', 'open', 'all'] as const

export type PlaneIssueFilter = (typeof PLANE_ISSUE_FILTERS)[number]

export function isPlaneIssueFilter(value: unknown): value is PlaneIssueFilter {
  return PLANE_ISSUE_FILTERS.some((filter) => filter === value)
}

export type PlaneListIssuesArgs = {
  filter?: PlaneIssueFilter
  projectId?: string
  limit?: number
}

export type PlaneResult<T> = ({ ok: true } & T) | { ok: false; error: string }

export type PlaneState = {
  id: string
  name: string
  group: PlaneStateGroup | null
}

export type PlaneMember = {
  id: string
  displayName: string
}

export const PLANE_PRIORITIES = ['none', 'urgent', 'high', 'medium', 'low'] as const

export type PlanePriority = (typeof PLANE_PRIORITIES)[number]

export function isPlanePriority(value: unknown): value is PlanePriority {
  return PLANE_PRIORITIES.some((priority) => priority === value)
}

export type PlaneIssueUpdate = {
  title?: string
  stateId?: string
  assigneeIds?: string[]
  priority?: PlanePriority
  labelIds?: string[]
  startDate?: string | null
  targetDate?: string | null
  parentId?: string | null
  cycleId?: string | null
}

export type PlaneCreateIssueArgs = {
  projectId: string
  title: string
  description?: string
  priority?: PlanePriority
  stateId?: string
  labelIds?: string[]
  parentId?: string
  cycleId?: string
}

export type PlaneBoard = {
  states: PlaneState[]
  labels: PlaneLabel[]
  cycles: PlaneCycle[]
  issues: PlaneIssueSummary[]
  /** Maps work item id to its cycle id; absent means no cycle. */
  cycleByIssueId: Record<string, string>
  /** True when the project has more work items than one board load reads. */
  truncated: boolean
}

export const PLANE_RELATION_TYPES = ['blocking', 'blocked_by', 'duplicate', 'relates_to'] as const

export type PlaneRelationType = (typeof PLANE_RELATION_TYPES)[number]

export function isPlaneRelationType(value: unknown): value is PlaneRelationType {
  return PLANE_RELATION_TYPES.some((type) => type === value)
}

export type PlaneIssueRelation = {
  type: PlaneRelationType
  issues: PlaneIssueSummary[]
}

export type PlaneIssueExtras = {
  /** Project labels and cycles, so the detail view can edit them without a board load. */
  labels: PlaneLabel[]
  cycles: PlaneCycle[]
  cycleId: string | null
  relations: PlaneIssueRelation[]
  subIssues: PlaneIssueSummary[]
  /** Related work items from other projects that could not be shown. */
  unresolvedRelationCount: number
}

export type PlaneSetRelationArgs = {
  key: string
  relatedKey: string
  type: PlaneRelationType
  remove?: boolean
}
