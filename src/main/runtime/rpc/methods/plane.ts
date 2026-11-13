import { defineMethod } from '../core'
import {
  PlaneAddComment,
  PlaneConnect,
  PlaneCreateIssue,
  PlaneIssueKey,
  PlaneListIssues,
  PlaneProjectRef,
  PlaneSetAgentWritePolicy,
  PlaneSetRelation,
  PlaneUpdateIssue
} from '../../../../shared/rpc-contract/plane-params'

type Authorize = (summary: string) => Promise<{ ok: boolean }>

/** Writes flagged `agent` come from the CLI and are gated by the user's agent write policy. */
async function gateAgentWrite<T>(
  agent: boolean | undefined,
  authorize: Authorize,
  summary: string,
  run: () => T
): Promise<T | Awaited<ReturnType<Authorize>>> {
  if (agent) {
    const decision = await authorize(summary)
    if (!decision.ok) {
      return decision
    }
  }
  return run()
}

export const PLANE_METHODS = [
  defineMethod({
    name: 'plane.connect',
    permission: 'accounts-admin',
    params: PlaneConnect,
    handler: async (params, { runtime }) =>
      runtime.planeConnect({
        workspaceSlug: params.workspaceSlug.trim(),
        apiKey: params.apiKey.trim()
      })
  }),
  defineMethod({
    name: 'plane.disconnect',
    permission: 'accounts-admin',
    params: null,
    handler: async (_params, { runtime }) => runtime.planeDisconnect()
  }),
  defineMethod({
    name: 'plane.status',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.planeStatus()
  }),
  defineMethod({
    name: 'plane.testConnection',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.planeTestConnection()
  }),
  defineMethod({
    name: 'plane.listProjects',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.planeListProjects()
  }),
  defineMethod({
    name: 'plane.listIssues',
    permission: 'workspace',
    params: PlaneListIssues,
    handler: async (params, { runtime, signal }) => runtime.planeListIssues(params, signal)
  }),
  defineMethod({
    name: 'plane.getIssue',
    permission: 'workspace',
    params: PlaneIssueKey,
    handler: async (params, { runtime }) => runtime.planeGetIssue(params.key.trim())
  }),
  defineMethod({
    name: 'plane.issueComments',
    permission: 'workspace',
    params: PlaneIssueKey,
    handler: async (params, { runtime }) => runtime.planeIssueComments(params.key.trim())
  }),
  defineMethod({
    name: 'plane.listStates',
    permission: 'workspace',
    params: PlaneProjectRef,
    handler: async (params, { runtime }) => runtime.planeListStates(params.projectId.trim())
  }),
  defineMethod({
    name: 'plane.listMembers',
    permission: 'workspace',
    params: PlaneProjectRef,
    handler: async (params, { runtime }) => runtime.planeListMembers(params.projectId.trim())
  }),
  defineMethod({
    name: 'plane.updateIssue',
    permission: 'workspace',
    params: PlaneUpdateIssue,
    handler: async (params, { runtime }) =>
      gateAgentWrite(
        params.agent,
        (summary) => runtime.planeAuthorizeAgentWrite(summary),
        `Update ${params.key.trim()}: ${Object.keys(params.updates).join(', ')}`,
        () => runtime.planeUpdateIssue(params.key.trim(), params.updates)
      )
  }),
  defineMethod({
    name: 'plane.addComment',
    permission: 'workspace',
    params: PlaneAddComment,
    handler: async (params, { runtime }) =>
      gateAgentWrite(
        params.agent,
        (summary) => runtime.planeAuthorizeAgentWrite(summary),
        `Comment on ${params.key.trim()}: ${params.body.slice(0, 200)}`,
        () => runtime.planeAddComment(params.key.trim(), params.body)
      )
  }),
  defineMethod({
    name: 'plane.createIssue',
    permission: 'workspace',
    params: PlaneCreateIssue,
    handler: async (params, { runtime }) =>
      gateAgentWrite(
        params.agent,
        (summary) => runtime.planeAuthorizeAgentWrite(summary),
        `Create work item "${params.title.trim()}"`,
        () =>
          runtime.planeCreateIssue({
            projectId: params.projectId.trim(),
            title: params.title.trim(),
            description: params.description,
            priority: params.priority,
            stateId: params.stateId,
            labelIds: params.labelIds,
            parentId: params.parentId,
            cycleId: params.cycleId
          })
      )
  }),
  defineMethod({
    name: 'plane.getBoard',
    permission: 'workspace',
    params: PlaneProjectRef,
    handler: async (params, { runtime, signal }) =>
      runtime.planeGetBoard(params.projectId.trim(), signal)
  }),
  defineMethod({
    name: 'plane.issueExtras',
    permission: 'workspace',
    params: PlaneIssueKey,
    handler: async (params, { runtime }) => runtime.planeIssueExtras(params.key.trim())
  }),
  defineMethod({
    name: 'plane.setRelation',
    permission: 'workspace',
    params: PlaneSetRelation,
    handler: async (params, { runtime }) =>
      gateAgentWrite(
        params.agent,
        (summary) => runtime.planeAuthorizeAgentWrite(summary),
        `${params.remove ? 'Remove' : 'Add'} ${params.type} relation: ${params.key.trim()} and ${params.relatedKey.trim()}`,
        () =>
          runtime.planeSetRelation({
            key: params.key.trim(),
            relatedKey: params.relatedKey.trim(),
            type: params.type,
            remove: params.remove
          })
      )
  }),
  defineMethod({
    name: 'plane.setAgentWritePolicy',
    permission: 'accounts-admin',
    params: PlaneSetAgentWritePolicy,
    handler: async (params, { runtime }) => runtime.planeSetAgentWritePolicy(params.policy)
  })
]
