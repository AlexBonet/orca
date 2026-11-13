import type { PlaneApi } from '../../../../preload/api/plane-api'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'
import {
  defaultScopeSource,
  rowLessSourceTarget,
  type DefaultScopeSource
} from '@/runtime/hosts/selection/default-creation-host'
import { callRuntimeRpc } from '../rpc/calls/runtime-rpc-call'

type PlaneSettings = DefaultScopeSource['settings']

const PLANE_NETWORK_TIMEOUT_MS = 30_000

function failureFrom(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : 'Plane request failed.' }
}

function resolveTarget(settings: PlaneSettings): RuntimeClientTarget {
  return rowLessSourceTarget(defaultScopeSource(settings))
}

/** Plane credentials live on the runtime host, so an active remote environment serves every call. */
export function createPlaneApi(getSettings: () => PlaneSettings): PlaneApi {
  const local = (): PlaneApi => window.api.plane

  function route<A extends unknown[], R>(
    method: string,
    run: (api: PlaneApi, ...args: A) => Promise<R>,
    toParams: (...args: A) => unknown = (...args) => args[0]
  ): (...args: A) => Promise<R> {
    return async (...args) => {
      const target = resolveTarget(getSettings())
      if (target.kind !== 'environment') {
        return run(local(), ...args)
      }
      try {
        return await callRuntimeRpc<R>(target, `plane.${method}`, toParams(...args), {
          timeoutMs: PLANE_NETWORK_TIMEOUT_MS
        })
      } catch (error) {
        // Older servers answer method_not_found; surface it as a normal failed result.
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: every routed method returns a PlaneResult, whose failure arm is exactly { ok: false, error }.
        return failureFrom(error) as R
      }
    }
  }

  return {
    connect: route('connect', (api, args) => api.connect(args)),
    disconnect: async () => {
      const target = resolveTarget(getSettings())
      if (target.kind === 'environment') {
        await callRuntimeRpc<{ ok: true }>(target, 'plane.disconnect', undefined, {
          timeoutMs: PLANE_NETWORK_TIMEOUT_MS
        })
        return
      }
      await local().disconnect()
    },
    status: async () => {
      const target = resolveTarget(getSettings())
      return target.kind === 'environment'
        ? callRuntimeRpc(target, 'plane.status', undefined, { timeoutMs: PLANE_NETWORK_TIMEOUT_MS })
        : local().status()
    },
    testConnection: route(
      'testConnection',
      (api) => api.testConnection(),
      () => undefined
    ),
    listProjects: route(
      'listProjects',
      (api) => api.listProjects(),
      () => undefined
    ),
    listIssues: route('listIssues', (api, args) => api.listIssues(args)),
    getIssue: route('getIssue', (api, args) => api.getIssue(args)),
    issueComments: route('issueComments', (api, args) => api.issueComments(args)),
    listStates: route('listStates', (api, args) => api.listStates(args)),
    listMembers: route('listMembers', (api, args) => api.listMembers(args)),
    updateIssue: route('updateIssue', (api, args) => api.updateIssue(args)),
    addComment: route('addComment', (api, args) => api.addComment(args)),
    createIssue: route('createIssue', (api, args) => api.createIssue(args)),
    setAgentWritePolicy: route('setAgentWritePolicy', (api, args) => api.setAgentWritePolicy(args)),
    getBoard: route('getBoard', (api, args) => api.getBoard(args)),
    issueExtras: route('issueExtras', (api, args) => api.issueExtras(args)),
    setRelation: route('setRelation', (api, args) => api.setRelation(args))
  }
}
