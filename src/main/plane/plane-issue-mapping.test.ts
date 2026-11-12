import { describe, expect, it } from 'vitest'
import { toPlaneIssueSummary } from './plane-issue-mapping'

const project = { id: 'p1', identifier: 'PROJ', name: 'Project' }

describe('toPlaneIssueSummary', () => {
  it('reads expanded state, assignees and labels', () => {
    const issue = toPlaneIssueSummary(
      {
        id: 'i1',
        name: 'Fix it',
        sequence_id: 142,
        priority: 'high',
        state: { name: 'In Progress', group: 'started' },
        assignees: [{ id: 'u1', display_name: 'Ana' }],
        labels: [{ name: 'bug' }]
      },
      'my-team',
      project
    )
    expect(issue).toMatchObject({
      key: 'PROJ-142',
      stateGroup: 'started',
      assigneeIds: ['u1'],
      assigneeNames: ['Ana'],
      labels: ['bug'],
      url: 'https://app.plane.so/my-team/browse/PROJ-142/'
    })
  })

  it('tolerates bare ids when expand is not honored', () => {
    const issue = toPlaneIssueSummary(
      { id: 'i1', name: 'x', sequence_id: 1, state: 'state-id', assignees: ['u1'], labels: ['l1'] },
      'my-team',
      project
    )
    expect(issue).toMatchObject({
      stateName: '',
      stateGroup: null,
      assigneeIds: ['u1'],
      labels: []
    })
  })

  it('drops records without a numeric sequence id', () => {
    expect(toPlaneIssueSummary({ id: 'i1', name: 'x' }, 'my-team', project)).toBeNull()
  })
})
