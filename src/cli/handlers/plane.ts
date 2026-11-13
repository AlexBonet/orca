import {
  PLANE_PRIORITIES,
  PLANE_RELATION_TYPES,
  isPlaneIssueFilter,
  isPlanePriority,
  isPlaneRelationType,
  type PlaneBoard,
  type PlaneComment,
  type PlaneIssue,
  type PlaneIssueExtras,
  type PlaneIssueSummary,
  type PlaneIssueUpdate,
  type PlaneMember,
  type PlanePriority,
  type PlaneProject
} from '../../shared/plane/plane-types'
import { readCommandBody } from '../command-body-input'
import type { CommandHandler, HandlerContext } from '../dispatch'
import {
  getOptionalPositiveIntegerFlag,
  getOptionalStringFlag,
  getRequiredStringFlag
} from '../flags'
import { printResult } from '../format'
import {
  formatPlaneIssueDetail,
  formatPlaneIssueList,
  formatPlaneMeta,
  formatPlaneProjects,
  type PlaneIssueDetailResult,
  type PlaneMetaResult
} from '../plane-format'
import {
  callPlane,
  resolveAssigneeIds,
  resolveCycleId,
  resolveLabelIds,
  resolveProject,
  resolveState
} from '../plane-name-resolution'
import { RuntimeClientError } from '../runtime-client'

const MAX_BODY_CHARACTERS = 20_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function readPriority(value: string): PlanePriority {
  const priority = value.trim().toLowerCase()
  if (!isPlanePriority(priority)) {
    throw new RuntimeClientError(
      'invalid_argument',
      `--priority must be one of: ${PLANE_PRIORITIES.join(', ')}.`
    )
  }
  return priority
}

function readDateOrNone(flag: string, value: string): string | null {
  if (value.trim().toLowerCase() === 'none') {
    return null
  }
  if (!DATE_PATTERN.test(value)) {
    throw new RuntimeClientError('invalid_argument', `--${flag} must be YYYY-MM-DD or none.`)
  }
  return value
}

async function resolveParentId(context: HandlerContext, input: string): Promise<string | null> {
  if (input.trim().toLowerCase() === 'none') {
    return null
  }
  const { value } = await callPlane<{ issue: PlaneIssue }>(context.client, 'getIssue', {
    key: input
  })
  return value.issue.id
}

async function buildUpdate(
  context: HandlerContext,
  issue: PlaneIssue,
  extras: PlaneIssueExtras
): Promise<PlaneIssueUpdate> {
  const { flags, client } = context
  const update: PlaneIssueUpdate = {}
  const title = getOptionalStringFlag(flags, 'title')
  const status = getOptionalStringFlag(flags, 'status')
  const priority = getOptionalStringFlag(flags, 'priority')
  const assignee = getOptionalStringFlag(flags, 'assignee')
  const labels = getOptionalStringFlag(flags, 'labels')
  const startDate = getOptionalStringFlag(flags, 'start-date')
  const dueDate = getOptionalStringFlag(flags, 'due-date')
  const cycle = getOptionalStringFlag(flags, 'cycle')
  const parent = getOptionalStringFlag(flags, 'parent')
  if (title !== undefined) {
    update.title = title
  }
  if (status !== undefined) {
    update.stateId = (await resolveState(client, issue.projectId, status)).id
  }
  if (priority !== undefined) {
    update.priority = readPriority(priority)
  }
  if (assignee !== undefined) {
    update.assigneeIds = await resolveAssigneeIds(client, issue.projectId, assignee)
  }
  if (labels !== undefined) {
    update.labelIds = resolveLabelIds(extras.labels, labels)
  }
  if (startDate !== undefined) {
    update.startDate = readDateOrNone('start-date', startDate)
  }
  if (dueDate !== undefined) {
    update.targetDate = readDateOrNone('due-date', dueDate)
  }
  if (cycle !== undefined) {
    update.cycleId = resolveCycleId(extras.cycles, cycle)
  }
  if (parent !== undefined) {
    update.parentId = await resolveParentId(context, parent)
  }
  if (Object.keys(update).length === 0) {
    throw new RuntimeClientError(
      'invalid_argument',
      'Pass at least one field to change, for example --status or --priority.'
    )
  }
  return update
}

function readRelationType(context: HandlerContext) {
  const type = getRequiredStringFlag(context.flags, 'type')
  if (!isPlaneRelationType(type)) {
    throw new RuntimeClientError(
      'invalid_argument',
      `--type must be one of: ${PLANE_RELATION_TYPES.join(', ')}.`
    )
  }
  return type
}

async function setRelation(context: HandlerContext, remove: boolean): Promise<void> {
  const { response } = await callPlane<object>(context.client, 'setRelation', {
    key: getRequiredStringFlag(context.flags, 'key'),
    relatedKey: getRequiredStringFlag(context.flags, 'to'),
    type: readRelationType(context),
    remove,
    agent: true
  })
  printResult(response, context.json, () => (remove ? 'Relation removed.' : 'Relation added.'))
}

export const PLANE_HANDLERS: Record<string, CommandHandler> = {
  'plane projects': async (context) => {
    const { response, value } = await callPlane<{ projects: PlaneProject[] }>(
      context.client,
      'listProjects'
    )
    printResult({ ...response, result: value.projects }, context.json, formatPlaneProjects)
  },
  'plane list': async (context) => {
    const project = getOptionalStringFlag(context.flags, 'project')
    const filter = getOptionalStringFlag(context.flags, 'filter')
    if (filter !== undefined && !isPlaneIssueFilter(filter)) {
      throw new RuntimeClientError(
        'invalid_argument',
        '--filter must be assigned, created, open or all.'
      )
    }
    const { response, value } = await callPlane<{ issues: PlaneIssueSummary[] }>(
      context.client,
      'listIssues',
      {
        filter,
        projectId: project ? (await resolveProject(context.client, project)).id : undefined,
        limit: getOptionalPositiveIntegerFlag(context.flags, 'limit')
      }
    )
    printResult({ ...response, result: value.issues }, context.json, formatPlaneIssueList)
  },
  'plane issue': async (context) => {
    const key = getRequiredStringFlag(context.flags, 'key')
    const [issue, comments, extras] = await Promise.all([
      callPlane<{ issue: PlaneIssue }>(context.client, 'getIssue', { key }),
      callPlane<{ comments: PlaneComment[] }>(context.client, 'issueComments', { key }),
      callPlane<{ extras: PlaneIssueExtras }>(context.client, 'issueExtras', { key })
    ])
    const result: PlaneIssueDetailResult = {
      issue: issue.value.issue,
      comments: comments.value.comments,
      extras: extras.value.extras
    }
    printResult({ ...issue.response, result }, context.json, formatPlaneIssueDetail)
  },
  'plane meta': async (context) => {
    const project = await resolveProject(
      context.client,
      getRequiredStringFlag(context.flags, 'project')
    )
    const [board, members] = await Promise.all([
      callPlane<{ board: PlaneBoard }>(context.client, 'getBoard', { projectId: project.id }),
      callPlane<{ members: PlaneMember[] }>(context.client, 'listMembers', {
        projectId: project.id
      })
    ])
    const result: PlaneMetaResult = {
      board: { ...board.value.board, issues: [], cycleByIssueId: {} },
      members: members.value.members
    }
    printResult({ ...board.response, result }, context.json, formatPlaneMeta)
  },
  'plane update': async (context) => {
    const key = getRequiredStringFlag(context.flags, 'key')
    const [issue, extras] = await Promise.all([
      callPlane<{ issue: PlaneIssue }>(context.client, 'getIssue', { key }),
      callPlane<{ extras: PlaneIssueExtras }>(context.client, 'issueExtras', { key })
    ])
    const updates = await buildUpdate(context, issue.value.issue, extras.value.extras)
    const { response } = await callPlane<object>(context.client, 'updateIssue', {
      key,
      updates,
      agent: true
    })
    printResult(response, context.json, () => `Updated ${issue.value.issue.key}.`)
  },
  'plane comment': async (context) => {
    const body = await readCommandBody(context.flags, context.cwd, {
      required: true,
      maximumCharacters: MAX_BODY_CHARACTERS,
      tooLargeCode: 'invalid_argument',
      label: 'Comment'
    })
    const { response } = await callPlane<object>(context.client, 'addComment', {
      key: getRequiredStringFlag(context.flags, 'key'),
      body,
      agent: true
    })
    printResult(response, context.json, () => 'Comment added.')
  },
  'plane create': async (context) => {
    const { flags, client } = context
    const project = await resolveProject(client, getRequiredStringFlag(flags, 'project'))
    const labels = getOptionalStringFlag(flags, 'labels')
    const cycle = getOptionalStringFlag(flags, 'cycle')
    const status = getOptionalStringFlag(flags, 'status')
    const priority = getOptionalStringFlag(flags, 'priority')
    const parent = getOptionalStringFlag(flags, 'parent')
    const needsBoard = labels !== undefined || cycle !== undefined
    const board = needsBoard
      ? (await callPlane<{ board: PlaneBoard }>(client, 'getBoard', { projectId: project.id }))
          .value.board
      : null
    const body = await readCommandBody(flags, context.cwd, {
      required: false,
      maximumCharacters: MAX_BODY_CHARACTERS,
      tooLargeCode: 'invalid_argument',
      label: 'Description'
    })
    const { response, value } = await callPlane<{ key: string }>(client, 'createIssue', {
      projectId: project.id,
      title: getRequiredStringFlag(flags, 'title'),
      description: body,
      priority: priority === undefined ? undefined : readPriority(priority),
      stateId:
        status === undefined ? undefined : (await resolveState(client, project.id, status)).id,
      labelIds: labels !== undefined && board ? resolveLabelIds(board.labels, labels) : undefined,
      cycleId:
        cycle !== undefined && board
          ? (resolveCycleId(board.cycles, cycle) ?? undefined)
          : undefined,
      parentId:
        parent === undefined ? undefined : ((await resolveParentId(context, parent)) ?? undefined),
      agent: true
    })
    printResult(response, context.json, () => `Created ${value.key}.`)
  },
  'plane relation add': (context) => setRelation(context, false),
  'plane relation rm': (context) => setRelation(context, true)
}
