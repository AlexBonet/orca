import { describe, expect, it } from 'vitest'
import { getVisibleRightSidebarActivityItems } from './right-sidebar-activity-visibility'
import type { ActivityBarItem } from './activity-bar-buttons'

const item = (id: string, extra: Partial<ActivityBarItem> = {}): ActivityBarItem =>
  ({ id, icon: () => null, title: id, shortcut: '', ...extra }) as ActivityBarItem

const items = [
  item('source-control', { gitOnly: true, showInFolderProject: true }),
  item('checks', { gitOnly: true })
]

const ids = (state: {
  isFolder: boolean
  isFolderProject: boolean
  isFolderWorkspace: boolean
}): string[] =>
  getVisibleRightSidebarActivityItems(items, { ...state, hasSshHost: false }).map((i) => i.id)

describe('getVisibleRightSidebarActivityItems', () => {
  it('keeps Source Control for plain-folder projects but hides other git-only tabs', () => {
    expect(ids({ isFolder: true, isFolderProject: true, isFolderWorkspace: false })).toEqual([
      'source-control'
    ])
  })

  it('keeps Source Control for folder workspaces but hides other git-only tabs', () => {
    expect(ids({ isFolder: true, isFolderProject: false, isFolderWorkspace: true })).toEqual([
      'source-control'
    ])
  })

  it('shows every git tab for git workspaces', () => {
    expect(ids({ isFolder: false, isFolderProject: false, isFolderWorkspace: false })).toEqual([
      'source-control',
      'checks'
    ])
  })
})
