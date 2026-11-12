import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HandlerContext } from '../dispatch'
import { PLANE_HANDLERS } from './plane'

const issue = { id: 'i1', key: 'POU-1', projectId: 'p1', title: 'T' }
const extras = {
  labels: [{ id: 'l1', name: 'web', color: null }],
  cycles: [{ id: 'c1', name: 'Sprint 1', startDate: null, endDate: null }],
  cycleId: null,
  relations: [],
  subIssues: [],
  unresolvedRelationCount: 0
}

function context(flags: Record<string, string>, calls: [string, unknown][]): HandlerContext {
  const call = vi.fn(async (method: string, params?: unknown) => {
    calls.push([method, params])
    const results: Record<string, unknown> = {
      'plane.getIssue': { ok: true, issue },
      'plane.issueExtras': { ok: true, extras },
      'plane.listStates': {
        ok: true,
        states: [{ id: 's2', name: 'In Progress', group: 'started' }]
      },
      'plane.updateIssue': { ok: true }
    }
    return { id: 'x', ok: true, result: results[method] ?? { ok: true }, _meta: {} }
  })
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the handler only calls client.call.
  return {
    flags: new Map(Object.entries(flags)),
    client: { call },
    cwd: '/tmp',
    json: false
  } as unknown as HandlerContext
}

describe('orca plane update', () => {
  beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('resolves names to ids and flags the write as coming from an agent', async () => {
    const calls: [string, unknown][] = []
    await PLANE_HANDLERS['plane update'](
      context(
        {
          key: 'POU-1',
          status: 'in progress',
          labels: 'WEB',
          cycle: 'sprint 1',
          'due-date': 'none'
        },
        calls
      )
    )
    expect(calls.find(([method]) => method === 'plane.updateIssue')?.[1]).toEqual({
      key: 'POU-1',
      updates: { stateId: 's2', labelIds: ['l1'], cycleId: 'c1', targetDate: null },
      agent: true
    })
  })

  it('refuses an unknown status instead of guessing, listing the valid ones', async () => {
    const calls: [string, unknown][] = []
    await expect(
      PLANE_HANDLERS['plane update'](context({ key: 'POU-1', status: 'Nope' }, calls))
    ).rejects.toThrow('Available: In Progress')
    expect(calls.some(([method]) => method === 'plane.updateIssue')).toBe(false)
  })

  it('requires at least one field to change', async () => {
    await expect(PLANE_HANDLERS['plane update'](context({ key: 'POU-1' }, []))).rejects.toThrow(
      'at least one field'
    )
  })
})
