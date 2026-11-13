// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const callRuntimeRpc = vi.hoisted(() => vi.fn())
vi.mock('../rpc/calls/runtime-rpc-call', () => ({ callRuntimeRpc }))

import { createPlaneApi } from './runtime-plane-client'

const localPlane = {
  status: vi.fn(),
  listIssues: vi.fn(),
  disconnect: vi.fn()
}

function settings(activeRuntimeEnvironmentId: string | null) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the client reads only activeRuntimeEnvironmentId from settings.
  return { activeRuntimeEnvironmentId } as never
}

describe('createPlaneApi', () => {
  beforeEach(() => {
    callRuntimeRpc.mockReset()
    Object.values(localPlane).forEach((fn) => fn.mockReset())
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: installs a minimal window stub with only api.plane.
    ;(globalThis as { window: unknown }).window = { api: { plane: localPlane } }
  })

  it('uses local IPC when no remote environment is active', async () => {
    localPlane.listIssues.mockResolvedValue({ ok: true, issues: [] })
    const api = createPlaneApi(() => settings(null))
    await api.listIssues({ filter: 'open' })
    expect(localPlane.listIssues).toHaveBeenCalledWith({ filter: 'open' })
    expect(callRuntimeRpc).not.toHaveBeenCalled()
  })

  it('sends calls to the paired server when a remote environment is active', async () => {
    callRuntimeRpc.mockResolvedValue({ ok: true, issues: [] })
    const api = createPlaneApi(() => settings('env-1'))
    await api.listIssues({ filter: 'open' })
    expect(callRuntimeRpc).toHaveBeenCalledWith(
      { kind: 'environment', environmentId: 'env-1' },
      'plane.listIssues',
      { filter: 'open' },
      expect.objectContaining({ timeoutMs: expect.any(Number) })
    )
    expect(localPlane.listIssues).not.toHaveBeenCalled()
  })

  it('turns a failed remote call into a normal failure result', async () => {
    callRuntimeRpc.mockRejectedValue(new Error('method_not_found'))
    const api = createPlaneApi(() => settings('env-1'))
    await expect(api.listProjects()).resolves.toEqual({ ok: false, error: 'method_not_found' })
  })
})
