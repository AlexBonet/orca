import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PlaneRequestModule from './plane-request'

const planeRequest = vi.hoisted(() => vi.fn())
vi.mock('./plane-request', async (importOriginal) => ({
  ...(await importOriginal<typeof PlaneRequestModule>()),
  planeRequest
}))

import { listPlaneIssues } from './plane-issues'

function raw(seq: number, over: Record<string, unknown> = {}) {
  return {
    id: `i${seq}`,
    name: `Issue ${seq}`,
    sequence_id: seq,
    state: { name: 'Todo', group: 'unstarted' },
    assignees: [],
    labels: [],
    created_by: 'other',
    updated_at: `2026-01-0${seq}T00:00:00Z`,
    ...over
  }
}

describe('listPlaneIssues', () => {
  beforeEach(() => {
    planeRequest.mockReset()
    planeRequest.mockImplementation(
      async (_key: string, path: string, params: { cursor?: string }) => {
        if (path.endsWith('/projects/')) {
          return { results: [{ id: 'p1', identifier: 'PROJ', name: 'Project' }] }
        }
        if (params.cursor === 'next') {
          return { results: [raw(3, { assignees: [{ id: 'me', display_name: 'Me' }] })] }
        }
        return {
          results: [
            raw(1, { state: { name: 'Done', group: 'completed' } }),
            raw(2, { created_by: 'me' })
          ],
          next_page_results: true,
          next_cursor: 'next'
        }
      }
    )
  })

  it('follows cursors and filters to issues assigned to the viewer', async () => {
    const issues = await listPlaneIssues('key', 'ws', 'me', { filter: 'assigned', projectId: 'p1' })
    expect(issues.map((issue) => issue.key)).toEqual(['PROJ-3'])
  })

  it('hides completed work for the open filter and sorts newest first', async () => {
    const issues = await listPlaneIssues('key', 'ws', 'me', { filter: 'open', projectId: 'p1' })
    expect(issues.map((issue) => issue.key)).toEqual(['PROJ-3', 'PROJ-2'])
  })

  it('filters by creator', async () => {
    const issues = await listPlaneIssues('key', 'ws', 'me', { filter: 'created' })
    expect(issues.map((issue) => issue.key)).toEqual(['PROJ-2'])
  })
})

describe('listPlaneIssues across many projects', () => {
  const projects = [
    { id: 'p1', identifier: 'ONE', name: 'One' },
    { id: 'p2', identifier: 'TWO', name: 'Two' },
    { id: 'p3', identifier: 'OLD', name: 'Old', archived_at: '2025-01-01T00:00:00Z' }
  ]

  function mockWorkspace(onItems: (projectId: string, cursor?: string) => unknown) {
    planeRequest.mockReset()
    planeRequest.mockImplementation(
      async (_key: string, path: string, params: { cursor?: string }) => {
        if (path.endsWith('/projects/')) {
          return { results: projects }
        }
        return onItems(path.split('/projects/')[1].split('/')[0], params.cursor)
      }
    )
  }

  it('reads one page per project and skips archived projects', async () => {
    mockWorkspace(() => ({ results: [raw(1)], next_page_results: true, next_cursor: 'more' }))
    await listPlaneIssues('key', 'ws', 'me', { filter: 'all' })
    const itemCalls = planeRequest.mock.calls.filter(([, path]) => path.includes('/work-items/'))
    expect(itemCalls).toHaveLength(2)
  })

  it('reads several pages when a single project is selected', async () => {
    mockWorkspace((_project, cursor) =>
      cursor
        ? { results: [raw(2)] }
        : { results: [raw(1)], next_page_results: true, next_cursor: 'more' }
    )
    const issues = await listPlaneIssues('key', 'ws', 'me', { filter: 'all', projectId: 'p1' })
    expect(issues).toHaveLength(2)
  })

  it('keeps results from readable projects when another one fails', async () => {
    mockWorkspace((projectId) => {
      if (projectId === 'p2') {
        throw new Error('forbidden')
      }
      return { results: [raw(1)] }
    })
    const issues = await listPlaneIssues('key', 'ws', 'me', { filter: 'all' })
    expect(issues.map((issue) => issue.projectIdentifier)).toEqual(['ONE'])
  })

  it('throws when every project fails', async () => {
    mockWorkspace(() => {
      throw new Error('forbidden')
    })
    await expect(listPlaneIssues('key', 'ws', 'me', { filter: 'all' })).rejects.toThrow('forbidden')
  })
})
