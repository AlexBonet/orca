import type {
  PlaneAgentWritePolicy,
  PlaneCreateIssueArgs,
  PlaneSetRelationArgs,
  PlaneIssueUpdate,
  PlaneListIssuesArgs
} from '../../../../shared/plane/plane-types'
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
} from '../../../plane/plane-client'
import { authorizePlaneAgentWrite } from '../../../plane/plane-agent-write-policy'

/** Plane credentials live on the runtime host, so remote clients reach Plane through these commands. */
export class RuntimePlaneCommands {
  planeConnect(args: { workspaceSlug: string; apiKey: string }) {
    return connectPlane(args)
  }

  planeDisconnect(): { ok: true } {
    disconnectPlane()
    return { ok: true }
  }

  planeStatus() {
    return getPlaneStatus()
  }

  planeTestConnection() {
    return testPlaneConnection()
  }

  planeListProjects() {
    return listPlaneProjectsForActiveWorkspace()
  }

  planeListIssues(args: PlaneListIssuesArgs | undefined, signal?: AbortSignal) {
    return listPlaneIssuesForActiveWorkspace(args ?? {}, signal)
  }

  planeGetIssue(key: string) {
    return getPlaneIssueForActiveWorkspace(key)
  }

  planeIssueComments(key: string) {
    return getPlaneIssueCommentsForActiveWorkspace(key)
  }

  planeListStates(projectId: string) {
    return listPlaneStatesForActiveWorkspace(projectId)
  }

  planeListMembers(projectId: string) {
    return listPlaneMembersForActiveWorkspace(projectId)
  }

  planeUpdateIssue(key: string, updates: PlaneIssueUpdate) {
    return updatePlaneIssueForActiveWorkspace(key, updates)
  }

  planeAddComment(key: string, body: string) {
    return addPlaneIssueCommentForActiveWorkspace(key, body)
  }

  planeCreateIssue(args: PlaneCreateIssueArgs) {
    return createPlaneIssueForActiveWorkspace(args)
  }

  planeSetAgentWritePolicy(policy: PlaneAgentWritePolicy): { ok: true } {
    setPlaneAgentWritePolicyValue(policy)
    return { ok: true }
  }

  planeAuthorizeAgentWrite(summary: string) {
    return authorizePlaneAgentWrite(summary)
  }

  planeGetBoard(projectId: string, signal?: AbortSignal) {
    return getPlaneBoardForActiveWorkspace(projectId, signal)
  }

  planeIssueExtras(key: string) {
    return getPlaneIssueExtrasForActiveWorkspace(key)
  }

  planeSetRelation(args: PlaneSetRelationArgs) {
    return setPlaneIssueRelationForActiveWorkspace(args)
  }
}
