import { z } from 'zod'
import { OptionalFiniteNumber, OptionalString, requiredString } from './rpc-param-primitives'
import {
  PLANE_AGENT_WRITE_POLICIES,
  PLANE_ISSUE_FILTERS,
  PLANE_PRIORITIES,
  PLANE_RELATION_TYPES
} from '../plane/plane-types'

const Priority = z.enum(PLANE_PRIORITIES)
const DateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()

export const PlaneConnect = z.object({
  workspaceSlug: requiredString('Workspace slug is required'),
  apiKey: requiredString('API key is required')
})

export const PlaneListIssues = z
  .object({
    filter: z.enum(PLANE_ISSUE_FILTERS).optional(),
    projectId: OptionalString,
    limit: OptionalFiniteNumber
  })
  .optional()

export const PlaneIssueKey = z.object({
  key: requiredString('Work item key is required')
})

export const PlaneProjectRef = z.object({
  projectId: requiredString('Project is required')
})

const AgentFlag = z.boolean().optional()

export const PlaneSetAgentWritePolicy = z.object({
  policy: z.enum(PLANE_AGENT_WRITE_POLICIES)
})

export const PlaneUpdateIssue = z.object({
  agent: AgentFlag,
  key: requiredString('Work item key is required'),
  updates: z.object({
    title: z.string().min(1).max(255).optional(),
    stateId: z.string().min(1).max(64).optional(),
    assigneeIds: z.array(z.string().max(64)).max(20).optional(),
    priority: Priority.optional(),
    labelIds: z.array(z.string().max(64)).max(50).optional(),
    startDate: DateOrNull.optional(),
    targetDate: DateOrNull.optional(),
    parentId: z.string().min(1).max(64).nullable().optional(),
    cycleId: z.string().min(1).max(64).nullable().optional()
  })
})

export const PlaneAddComment = z.object({
  agent: AgentFlag,
  key: requiredString('Work item key is required'),
  body: z.string().min(1, 'Comment cannot be empty').max(20_000)
})

export const PlaneCreateIssue = z.object({
  agent: AgentFlag,
  projectId: requiredString('Project is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(20_000).optional(),
  priority: Priority.optional(),
  stateId: z.string().min(1).max(64).optional(),
  labelIds: z.array(z.string().max(64)).max(50).optional(),
  parentId: z.string().min(1).max(64).optional(),
  cycleId: z.string().min(1).max(64).optional()
})

export const PlaneSetRelation = z.object({
  agent: AgentFlag,
  key: requiredString('Work item key is required'),
  relatedKey: requiredString('Related work item key is required'),
  type: z.enum(PLANE_RELATION_TYPES),
  remove: z.boolean().optional()
})
