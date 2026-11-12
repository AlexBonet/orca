import { describe, expect, it } from 'vitest'
import type { PlaneBoard, PlaneIssueSummary } from '../../../../shared/plane/plane-types'
import {
  NO_CYCLE_LANE,
  applyPlaneBoardUpdate,
  buildPlaneBoardLayout,
  planeBoardDropUpdate
} from './plane-board-layout'

function issue(id: string, over: Partial<PlaneIssueSummary> = {}): PlaneIssueSummary {
  return {
    id,
    key: `P-${id}`,
    title: `Task ${id}`,
    priority: 'none',
    stateId: 's-todo',
    stateName: 'Todo',
    stateGroup: 'unstarted',
    projectId: 'p',
    projectIdentifier: 'P',
    projectName: 'Project',
    assigneeIds: [],
    assigneeNames: [],
    labels: [],
    labelItems: [],
    startDate: null,
    targetDate: null,
    parentId: null,
    subIssueCount: 0,
    url: '',
    createdAt: '',
    updatedAt: '',
    ...over
  }
}

const board: PlaneBoard = {
  states: [
    { id: 's-todo', name: 'Todo', group: 'unstarted' },
    { id: 's-done', name: 'Done', group: 'completed' }
  ],
  labels: [],
  cycles: [
    { id: 'c1', name: 'Sprint 1', startDate: '2026-01-01', endDate: null },
    { id: 'c2', name: 'Sprint 2', startDate: '2026-02-01', endDate: null }
  ],
  issues: [
    issue('1'),
    issue('2', { stateId: 's-done', stateName: 'Done', stateGroup: 'completed' }),
    issue('3', { assigneeIds: ['me'] })
  ],
  cycleByIssueId: { '1': 'c1', '2': 'c2' },
  truncated: false
}

describe('buildPlaneBoardLayout', () => {
  it('lays out cycle lanes newest first with a trailing no-cycle lane', () => {
    const layout = buildPlaneBoardLayout(board, { groupBy: 'cycle', query: '', assigneeId: null })
    expect(layout.lanes.map((lane) => lane.id)).toEqual(['c2', 'c1', NO_CYCLE_LANE])
    expect(layout.lanes[0].cells['s-done'].map((entry) => entry.id)).toEqual(['2'])
    expect(layout.lanes[2].cells['s-todo'].map((entry) => entry.id)).toEqual(['3'])
  })

  it('filters by assignee and text before counting', () => {
    const mine = buildPlaneBoardLayout(board, { groupBy: 'none', query: '', assigneeId: 'me' })
    expect(mine.lanes[0].count).toBe(1)
    const search = buildPlaneBoardLayout(board, { groupBy: 'none', query: 'p-2', assigneeId: null })
    expect(search.lanes[0].cells['s-done']).toHaveLength(1)
  })

  it('keeps issues whose cycle is unknown visible in the no-cycle lane', () => {
    const orphaned = { ...board, cycleByIssueId: { '1': 'archived' } }
    const layout = buildPlaneBoardLayout(orphaned, {
      groupBy: 'cycle',
      query: '',
      assigneeId: null
    })
    expect(layout.lanes.find((lane) => lane.id === NO_CYCLE_LANE)?.cells['s-todo']).toHaveLength(2)
  })
})

describe('planeBoardDropUpdate', () => {
  it('moves state and cycle together and clears the cycle for the no-cycle lane', () => {
    const card = issue('1')
    expect(
      planeBoardDropUpdate(
        card,
        { laneId: 'c2', stateId: 's-done' },
        { groupBy: 'cycle', currentLaneId: 'c1' }
      )
    ).toEqual({ stateId: 's-done', cycleId: 'c2' })
    expect(
      planeBoardDropUpdate(
        card,
        { laneId: NO_CYCLE_LANE, stateId: 's-todo' },
        { groupBy: 'cycle', currentLaneId: 'c1' }
      )
    ).toEqual({ cycleId: null })
  })

  it('returns nothing when dropped where it already is', () => {
    expect(
      planeBoardDropUpdate(
        issue('1'),
        { laneId: 'c1', stateId: 's-todo' },
        { groupBy: 'cycle', currentLaneId: 'c1' }
      )
    ).toEqual({})
  })
})

describe('applyPlaneBoardUpdate', () => {
  it('moves the card to the target state and cycle without touching others', () => {
    const next = applyPlaneBoardUpdate(board, '1', { stateId: 's-done', cycleId: 'c2' })
    expect(next.issues[0]).toMatchObject({ stateId: 's-done', stateName: 'Done' })
    expect(next.cycleByIssueId['1']).toBe('c2')
    expect(next.issues[2]).toBe(board.issues[2])
  })

  it('removes the cycle membership when the cycle is cleared', () => {
    const next = applyPlaneBoardUpdate(board, '1', { cycleId: null })
    expect(next.cycleByIssueId).toEqual({ '2': 'c2' })
  })
})
