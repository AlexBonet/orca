import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PlaneRequestModule from './plane-request'

const planeRequest = vi.hoisted(() => vi.fn())
vi.mock('./plane-request', async (importOriginal) => ({
  ...(await importOriginal<typeof PlaneRequestModule>()),
  planeRequest
}))

import { getPlaneBoard } from './plane-board'

const project = { id: 'p1', identifier: 'PROJ', name: 'Project' }

function item(seq: number, over: Record<string, unknown> = {}) {
  return {
    id: `i${seq}`,
    name: `Issue ${seq}`,
    sequence_id: seq,
    state: { id: 's1', name: 'Todo', group: 'unstarted' },
    assignees: [],
    labels: [{ id: 'l1', name: 'web', color: '#00f' }],
    start_date: '2026-03-01',
    target_date: null,
    parent: 'i1',
    sub_issues_count: 2,
    updated_at: `2026-01-0${seq}T00:00:00Z`,
    ...over
  }
}

describe('getPlaneBoard', () => {
  beforeEach(() => {
    planeRequest.mockReset()
    planeRequest.mockImplementation(async (_key: string, path: string) => {
      if (path.endsWith('/projects/')) {
        return { results: [project] }
      }
      if (path.endsWith('/states/')) {
        return { results: [{ id: 's1', name: 'Todo', group: 'unstarted' }] }
      }
      if (path.endsWith('/labels/')) {
        return { results: [{ id: 'l1', name: 'web', color: '#00f' }] }
      }
      if (path.endsWith('/cycles/')) {
        return { results: [{ id: 'c1', name: 'Sprint 1', start_date: '2026-03-01' }] }
      }
      if (path.endsWith('/cycle-issues/')) {
        return { results: [{ id: 'row', cycle: 'c1', issue: 'i2' }] }
      }
      return { results: [item(1), item(2)] }
    })
  })

  it('combines states, labels, cycle membership and card fields', async () => {
    const board = await getPlaneBoard('key', 'ws', 'me', project)
    expect(board.states).toHaveLength(1)
    expect(board.labels).toEqual([{ id: 'l1', name: 'web', color: '#00f' }])
    expect(board.cycles[0]).toMatchObject({ id: 'c1', startDate: '2026-03-01' })
    expect(board.cycleByIssueId).toEqual({ i2: 'c1' })
    expect(board.issues[0]).toMatchObject({
      startDate: '2026-03-01',
      parentId: 'i1',
      subIssueCount: 2
    })
    expect(board.truncated).toBe(false)
  })

  it('still returns a board when the project has no cycles or labels enabled', async () => {
    const original = planeRequest.getMockImplementation()
    planeRequest.mockImplementation(async (key: string, path: string, ...rest: unknown[]) => {
      if (path.endsWith('/labels/') || path.endsWith('/cycles/')) {
        throw new Error('disabled')
      }
      return original?.(key, path, ...rest)
    })
    const board = await getPlaneBoard('key', 'ws', 'me', project)
    expect(board.labels).toEqual([])
    expect(board.cycles).toEqual([])
    expect(board.issues).toHaveLength(2)
  })
})
