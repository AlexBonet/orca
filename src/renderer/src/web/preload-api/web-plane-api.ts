import type { PreloadApi } from '../../../../preload/api-types'
import { callRuntimeResult } from './web-runtime-calls'

const PLANE_NETWORK_TIMEOUT_MS = 30_000

function planeCall<TResult>(method: string, params?: unknown) {
  return callRuntimeResult<TResult>(`plane.${method}`, params, PLANE_NETWORK_TIMEOUT_MS)
}

export function createWebPlaneApi(): PreloadApi['plane'] {
  return {
    connect: (args) => planeCall('connect', args),
    disconnect: async () => {
      await planeCall('disconnect')
    },
    status: () => planeCall('status'),
    testConnection: () => planeCall('testConnection'),
    listProjects: () => planeCall('listProjects'),
    listIssues: (args) => planeCall('listIssues', args),
    getIssue: (args) => planeCall('getIssue', args),
    issueComments: (args) => planeCall('issueComments', args),
    listStates: (args) => planeCall('listStates', args),
    listMembers: (args) => planeCall('listMembers', args),
    updateIssue: (args) => planeCall('updateIssue', args),
    addComment: (args) => planeCall('addComment', args),
    createIssue: (args) => planeCall('createIssue', args),
    setAgentWritePolicy: (args) => planeCall('setAgentWritePolicy', args),
    getBoard: (args) => planeCall('getBoard', args),
    issueExtras: (args) => planeCall('issueExtras', args),
    setRelation: (args) => planeCall('setRelation', args)
  }
}
