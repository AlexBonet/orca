import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestStore } from '../testing/app-store-test-fixture'

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() }
}))

const getContainingGitRoot = vi.fn()
const add = vi.fn()

beforeEach(() => {
  getContainingGitRoot.mockReset()
  add.mockReset()
  vi.stubGlobal('window', { api: { repos: { getContainingGitRoot, add } } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('addRepoPath for a folder inside a Git repository', () => {
  it('asks before resolving a subfolder to the enclosing repository', async () => {
    getContainingGitRoot.mockResolvedValue({ rootPath: '/Users/me/ws' })
    const store = createTestStore()

    await expect(store.getState().addRepoPath('/Users/me/ws/pou', 'git')).resolves.toBeNull()

    expect(add).not.toHaveBeenCalled()
    expect(store.getState().activeModal).toBe('confirm-non-git-folder')
    expect(store.getState().modalData).toMatchObject({
      folderPath: '/Users/me/ws/pou',
      insideGitRoot: '/Users/me/ws'
    })
  })

  it('keeps the normal Git flow when the picked path is the repository root', async () => {
    getContainingGitRoot.mockResolvedValue({ rootPath: null })
    add.mockResolvedValue({ error: 'Not a valid git repository: /Users/me/plain' })
    const store = createTestStore()

    await store.getState().addRepoPath('/Users/me/plain', 'git')

    expect(add).toHaveBeenCalledTimes(1)
    expect(store.getState().modalData).not.toHaveProperty('insideGitRoot')
  })

  it('adds a folder project without probing for an enclosing repository', async () => {
    add.mockResolvedValue({ error: 'unreachable in this test' })
    const store = createTestStore()

    await store.getState().addRepoPath('/Users/me/ws/pou', 'folder')

    expect(getContainingGitRoot).not.toHaveBeenCalled()
  })
})
