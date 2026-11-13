import '../unused-default-rpc-methods.test-fixture'
import { describe, expect, it, vi } from 'vitest'
import { RpcDispatcher } from '../dispatcher'
import type { RpcRequest } from '../core'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { PLANE_METHODS } from './plane'

function makeRequest(method: string, params?: unknown): RpcRequest {
  return { id: 'req-1', authToken: 'tok', method, params }
}

function makeDispatcher(overrides: Record<string, unknown>) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the dispatcher only calls the plane* stubs under test.
  const runtime = {
    getRuntimeId: () => 'test-runtime',
    ...overrides
  } as unknown as OrcaRuntimeService
  return { runtime, dispatcher: new RpcDispatcher({ runtime, methods: PLANE_METHODS }) }
}

describe('plane RPC methods', () => {
  it('trims connection input before it reaches the host', async () => {
    const planeConnect = vi.fn().mockResolvedValue({ ok: true })
    const { dispatcher } = makeDispatcher({ planeConnect })
    await dispatcher.dispatch(
      makeRequest('plane.connect', { workspaceSlug: ' my-team ', apiKey: ' key ' })
    )
    expect(planeConnect).toHaveBeenCalledWith({ workspaceSlug: 'my-team', apiKey: 'key' })
  })

  it('routes reads and writes to the runtime', async () => {
    const planeListIssues = vi.fn().mockResolvedValue({ ok: true, issues: [] })
    const planeUpdateIssue = vi.fn().mockResolvedValue({ ok: true })
    const planeCreateIssue = vi.fn().mockResolvedValue({ ok: true, key: 'PROJ-1' })
    const { dispatcher } = makeDispatcher({ planeListIssues, planeUpdateIssue, planeCreateIssue })

    await dispatcher.dispatch(
      makeRequest('plane.listIssues', { filter: 'assigned', projectId: 'p1' })
    )
    await dispatcher.dispatch(
      makeRequest('plane.updateIssue', { key: ' PROJ-1 ', updates: { stateId: 's1' } })
    )
    await dispatcher.dispatch(
      makeRequest('plane.createIssue', { projectId: 'p1', title: ' Fix ', priority: 'high' })
    )

    expect(planeListIssues.mock.calls[0][0]).toMatchObject({ filter: 'assigned', projectId: 'p1' })
    expect(planeUpdateIssue).toHaveBeenCalledWith(
      'PROJ-1',
      expect.objectContaining({ stateId: 's1' })
    )
    expect(planeCreateIssue).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', title: 'Fix', priority: 'high' })
    )
  })

  it('rejects invalid input without calling the runtime', async () => {
    const planeAddComment = vi.fn()
    const planeUpdateIssue = vi.fn()
    const { dispatcher } = makeDispatcher({ planeAddComment, planeUpdateIssue })

    const empty = await dispatcher.dispatch(
      makeRequest('plane.addComment', { key: 'A-1', body: '' })
    )
    const badPriority = await dispatcher.dispatch(
      makeRequest('plane.updateIssue', { key: 'A-1', updates: { priority: 'critical' } })
    )

    expect(empty.ok).toBe(false)
    expect(badPriority.ok).toBe(false)
    expect(planeAddComment).not.toHaveBeenCalled()
    expect(planeUpdateIssue).not.toHaveBeenCalled()
  })
})
