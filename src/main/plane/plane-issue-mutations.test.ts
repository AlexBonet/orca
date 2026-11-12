import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as PlaneRequestModule from './plane-request'

const planeRequest = vi.hoisted(() => vi.fn())
vi.mock('./plane-request', async (importOriginal) => ({
  ...(await importOriginal<typeof PlaneRequestModule>()),
  planeRequest
}))

import {
  addPlaneIssueComment,
  createPlaneIssue,
  setPlaneIssueRelation,
  updatePlaneIssue
} from './plane-issue-mutations'

const issue = { id: 'i1', projectId: 'p1' }

describe('plane issue mutations', () => {
  beforeEach(() => planeRequest.mockReset())

  it('maps updates to the Plane PATCH body', async () => {
    planeRequest.mockResolvedValue({})
    await updatePlaneIssue('key', 'ws', issue, {
      stateId: 's1',
      assigneeIds: ['u1'],
      priority: 'high'
    })
    expect(planeRequest).toHaveBeenCalledWith(
      'key',
      '/workspaces/ws/projects/p1/work-items/i1/',
      undefined,
      undefined,
      { method: 'PATCH', json: { state: 's1', assignees: ['u1'], priority: 'high' } }
    )
  })

  it('refuses an empty update without calling Plane', async () => {
    await expect(updatePlaneIssue('key', 'ws', issue, {})).rejects.toThrow('Nothing to update')
    expect(planeRequest).not.toHaveBeenCalled()
  })

  it('escapes comment text before sending it as HTML', async () => {
    planeRequest.mockResolvedValue({})
    await addPlaneIssueComment('key', 'ws', issue, '<b>hi</b>')
    expect(planeRequest.mock.calls[0][4]).toEqual({
      method: 'POST',
      json: { comment_html: '<p>&lt;b&gt;hi&lt;/b&gt;</p>' }
    })
  })

  it('creates a work item and returns its sequence number', async () => {
    planeRequest.mockResolvedValue({ id: 'new', sequence_id: 7 })
    const created = await createPlaneIssue('key', 'ws', {
      projectId: 'p1',
      title: '  Fix it ',
      description: 'details',
      priority: 'low'
    })
    expect(created).toEqual({ id: 'new', sequenceId: 7 })
    expect(planeRequest.mock.calls[0][4]).toEqual({
      method: 'POST',
      json: { name: 'Fix it', description_html: '<p>details</p>', priority: 'low' }
    })
  })

  it('maps labels, dates and parent, keeping explicit nulls to clear them', async () => {
    planeRequest.mockResolvedValue({})
    await updatePlaneIssue('key', 'ws', issue, {
      labelIds: ['l1'],
      startDate: null,
      targetDate: '2026-12-01',
      parentId: 'parent'
    })
    expect(planeRequest.mock.calls[0][4]).toEqual({
      method: 'PATCH',
      json: { labels: ['l1'], start_date: null, target_date: '2026-12-01', parent: 'parent' }
    })
  })

  it('assigns a cycle without a PATCH when only the cycle changes', async () => {
    planeRequest.mockResolvedValue({})
    await updatePlaneIssue('key', 'ws', issue, { cycleId: 'c1' })
    expect(planeRequest).toHaveBeenCalledTimes(1)
    expect(planeRequest).toHaveBeenCalledWith(
      'key',
      '/workspaces/ws/projects/p1/cycles/c1/cycle-issues/',
      undefined,
      undefined,
      { method: 'POST', json: { issues: ['i1'] } }
    )
  })

  it('adds and removes relations through the relations endpoints', async () => {
    planeRequest.mockResolvedValue({})
    await setPlaneIssueRelation('key', 'ws', issue, 'i2', 'blocked_by', false)
    await setPlaneIssueRelation('key', 'ws', issue, 'i2', 'blocked_by', true)
    expect(planeRequest.mock.calls[0].slice(1, 2)).toEqual([
      '/workspaces/ws/projects/p1/work-items/i1/relations/'
    ])
    expect(planeRequest.mock.calls[0][4].json).toEqual({
      relation_type: 'blocked_by',
      issues: ['i2']
    })
    expect(planeRequest.mock.calls[1][1]).toBe(
      '/workspaces/ws/projects/p1/work-items/i1/relations/remove/'
    )
    expect(planeRequest.mock.calls[1][4].json).toEqual({ related_issue: 'i2' })
  })
})
