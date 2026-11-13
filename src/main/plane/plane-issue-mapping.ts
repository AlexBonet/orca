import { asPlaneRecord } from '../../shared/plane/plane-json'
import { buildPlaneIssueUrl } from '../../shared/plane/plane-issue-url'
import type {
  PlaneComment,
  PlaneCycle,
  PlaneLabel,
  PlaneIssue,
  PlaneIssueSummary,
  PlaneProject,
  PlaneStateGroup,
  PlaneViewer
} from '../../shared/plane/plane-types'

const STATE_GROUPS: readonly PlaneStateGroup[] = [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled'
]

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asDate(value: unknown): string | null {
  return typeof value === 'string' && value ? value.slice(0, 10) : null
}

export function toPlaneLabel(raw: unknown): PlaneLabel | null {
  const record = asPlaneRecord(raw)
  const id = asString(record?.id)
  const name = asString(record?.name)
  return record && id && name ? { id, name, color: asString(record.color) || null } : null
}

export function toPlaneCycle(raw: unknown): PlaneCycle | null {
  const record = asPlaneRecord(raw)
  const id = asString(record?.id)
  if (!record || !id || record.archived_at) {
    return null
  }
  return {
    id,
    name: asString(record.name) || id,
    startDate: asDate(record.start_date),
    endDate: asDate(record.end_date)
  }
}

function memberName(member: unknown): string {
  const record = asPlaneRecord(member)
  return record ? asString(record.display_name) || asString(record.first_name) : ''
}

/** Plane returns embedded objects when `expand` is honored and bare ids otherwise. */
function memberId(member: unknown): string {
  return typeof member === 'string' ? member : asString(asPlaneRecord(member)?.id)
}

export function toPlaneViewer(raw: unknown): PlaneViewer | null {
  const record = asPlaneRecord(raw)
  const id = asString(record?.id)
  if (!record || !id) {
    return null
  }
  const email = asString(record.email)
  return {
    id,
    displayName: asString(record.display_name) || asString(record.first_name) || email || id,
    email: email || null
  }
}

export function toPlaneProject(raw: unknown): PlaneProject | null {
  const record = asPlaneRecord(raw)
  const id = asString(record?.id)
  const identifier = asString(record?.identifier)
  // Archived projects clutter the picker and their work items are read-only.
  if (record?.archived_at) {
    return null
  }
  return record && id && identifier
    ? { id, identifier, name: asString(record.name) || identifier }
    : null
}

export function toPlaneIssueSummary(
  raw: unknown,
  workspaceSlug: string,
  project: PlaneProject
): PlaneIssueSummary | null {
  const record = asPlaneRecord(raw)
  const id = asString(record?.id)
  const sequenceId = record?.sequence_id
  if (!record || !id || typeof sequenceId !== 'number') {
    return null
  }
  const state = asPlaneRecord(record.state)
  const group = asString(state?.group)
  const assignees = Array.isArray(record.assignees) ? record.assignees : []
  const labels = Array.isArray(record.labels) ? record.labels : []
  const key = `${project.identifier}-${sequenceId}`
  return {
    id,
    key,
    title: asString(record.name),
    priority: asString(record.priority) || 'none',
    stateId: asString(state?.id),
    stateName: asString(state?.name),
    stateGroup: STATE_GROUPS.find((candidate) => candidate === group) ?? null,
    projectId: project.id,
    projectIdentifier: project.identifier,
    projectName: project.name,
    assigneeIds: assignees.map(memberId).filter(Boolean),
    assigneeNames: assignees.map(memberName).filter(Boolean),
    labels: labels.map((label) => asString(asPlaneRecord(label)?.name)).filter(Boolean),
    labelItems: labels.flatMap((label) => {
      const item = toPlaneLabel(label)
      return item ? [item] : []
    }),
    startDate: asDate(record.start_date),
    targetDate: asDate(record.target_date),
    parentId: memberId(record.parent) || null,
    subIssueCount: typeof record.sub_issues_count === 'number' ? record.sub_issues_count : 0,
    url: buildPlaneIssueUrl(workspaceSlug, key),
    createdAt: asString(record.created_at),
    updatedAt: asString(record.updated_at)
  }
}

export function toPlaneIssue(
  raw: unknown,
  workspaceSlug: string,
  project: PlaneProject
): PlaneIssue | null {
  const summary = toPlaneIssueSummary(raw, workspaceSlug, project)
  const record = asPlaneRecord(raw)
  return summary && record
    ? { ...summary, descriptionHtml: asString(record.description_html) }
    : null
}

export function toPlaneComment(raw: unknown): PlaneComment | null {
  const record = asPlaneRecord(raw)
  const id = asString(record?.id)
  if (!record || !id) {
    return null
  }
  const actor = record.actor_detail ?? record.actor
  return {
    id,
    authorName: memberName(actor) || 'Unknown',
    bodyHtml: asString(record.comment_html),
    createdAt: asString(record.created_at)
  }
}
