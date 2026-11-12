import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PlaneRequestModule from './plane-request'
import type { PlaneIssue } from '../../shared/plane/plane-types'

const planeRequest = vi.hoisted(() => vi.fn())
vi.mock('./plane-request', async (importOriginal) => ({
  ...(await importOriginal<typeof PlaneRequestModule>()),
  planeRequest
}))

import { getPlaneIssueExtras, invalidatePlaneProjectIssues } from './plane-issue-extras'

function item(seq: number, parent?: string) {
  return {
    id: `i${seq}`,
    name: `Issue ${seq}`,
    sequence_id: seq,
    state: { id: 's1', name: 'Todo', group: 'unstarted' },
    parent,
    updated_at: '2026-01-01T00:00:00Z'
  }
}

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: extras only reads id and projectId.
const issue = { id: 'i1', projectId: 'p1' } as PlaneIssue

describe('getPlaneIssueExtras', () => {
  beforeEach(() => {
    invalidatePlaneProjectIssues()
    planeRequest.mockReset()
    planeRequest.mockImplementation(async (_key: string, path: string) => {
      if (path.endsWith('/projects/')) {
        return { results: [{ id: 'p1', identifier: 'PROJ', name: 'Project' }] }
      }
      if (path.endsWith('/labels/')) {
        return { results: [{ id: 'l1', name: 'web' }] }
      }
      if (path.endsWith('/cycles/')) {
        return { results: [{ id: 'c1', name: 'Sprint 1' }] }
      }
      if (path.endsWith('/cycle-issues/')) {
        return { results: [{ issue: 'i1' }] }
      }
      if (path.endsWith('/relations/')) {
        return { blocked_by: ['i2'], relates_to: ['other-project'], blocking: [] }
      }
      return { results: [item(1), item(2), item(3, 'i1')] }
    })
  })

  it('derives sub-issues from parents and resolves same-project relations', async () => {
    const extras = await getPlaneIssueExtras('key', 'ws', 'me', issue)
    expect(extras.subIssues.map((entry) => entry.key)).toEqual(['PROJ-3'])
    expect(extras.relations).toHaveLength(1)
    expect(extras.relations[0]).toMatchObject({ type: 'blocked_by' })
    expect(extras.relations[0].issues[0].key).toBe('PROJ-2')
    expect(extras.unresolvedRelationCount).toBe(1)
    expect(extras.cycleId).toBe('c1')
    expect(extras.labels).toEqual([{ id: 'l1', name: 'web', color: null }])
  })

  it('reuses the project list for repeated detail opens until a write invalidates it', async () => {
    await getPlaneIssueExtras('key', 'ws', 'me', issue)
    const first = planeRequest.mock.calls.filter(([, path]) => path.endsWith('/work-items/')).length
    await getPlaneIssueExtras('key', 'ws', 'me', issue)
    const second = planeRequest.mock.calls.filter(([, path]) =>
      path.endsWith('/work-items/')
    ).length
    expect(second).toBe(first)
  })

  it('shows sub-issues even when relations are unavailable', async () => {
    const original = planeRequest.getMockImplementation()
    planeRequest.mockImplementation(async (key: string, path: string, ...rest: unknown[]) => {
      if (path.endsWith('/relations/')) {
        throw new Error('not enabled')
      }
      return original?.(key, path, ...rest)
    })
    const extras = await getPlaneIssueExtras('key', 'ws', 'me', issue)
    expect(extras.relations).toEqual([])
    expect(extras.subIssues).toHaveLength(1)
  })
})
