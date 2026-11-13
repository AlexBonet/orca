import { beforeEach, describe, expect, it, vi } from 'vitest'

const planeRequest = vi.hoisted(() => vi.fn())
vi.mock('./plane-request', () => ({ planeRequest }))

import { listPlaneMembers, listPlaneStates } from './plane-project-metadata'

describe('plane project metadata', () => {
  beforeEach(() => planeRequest.mockReset())

  it('reads states from a paginated response and ignores unknown groups', async () => {
    planeRequest.mockResolvedValue({
      results: [
        { id: 's1', name: 'Todo', group: 'unstarted' },
        { id: 's2', name: 'Weird', group: 'custom' },
        { name: 'no id' }
      ]
    })
    expect(await listPlaneStates('key', 'ws', 'p1')).toEqual([
      { id: 's1', name: 'Todo', group: 'unstarted' },
      { id: 's2', name: 'Weird', group: null }
    ])
  })

  it('reads members from flat, nested-member and doubly wrapped shapes', async () => {
    planeRequest.mockResolvedValue([
      [
        { id: 'u2', display_name: 'Zoe' },
        { member: { id: 'u1', display_name: 'Ana' } },
        { id: 'u3', email: 'x@example.com' }
      ]
    ])
    expect((await listPlaneMembers('key', 'ws', 'p1')).map((member) => member.displayName)).toEqual(
      ['Ana', 'x@example.com', 'Zoe']
    )
  })
})
