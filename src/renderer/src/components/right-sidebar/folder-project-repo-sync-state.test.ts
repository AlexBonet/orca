import { describe, expect, it } from 'vitest'
import { getFolderProjectRepoSyncAction } from './folder-project-repo-sync-state'

const upstream = (ahead: number, behind: number, hasUpstream = true) => ({
  hasUpstream,
  ahead,
  behind
})

describe('getFolderProjectRepoSyncAction', () => {
  it.each([
    [undefined, null],
    [upstream(0, 0, false), 'publish'],
    [{ ...upstream(0, 0, false), hasConfiguredPushTarget: true }, 'push'],
    [upstream(0, 0), null],
    [upstream(2, 0), 'push'],
    [upstream(0, 3), 'pull'],
    [upstream(1, 1), 'sync']
  ])('maps %j to %s', (status, expected) => {
    expect(getFolderProjectRepoSyncAction(status)).toBe(expected)
  })
})
