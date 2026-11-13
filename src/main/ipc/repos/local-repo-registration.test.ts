import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repo } from '../../../shared/repo-types'
import type { Store } from '../../persistence/loading-store/store'
import { addLocalRepoFromPath } from './local-repo-registration'

vi.mock('../../repository-icons/repo-icon-autodetect', () => ({
  detectRepoLocalMetadata: vi.fn().mockResolvedValue({})
}))
vi.mock('../../workspaces/creation/worktree-root-preparation', () => ({
  prepareLocalWorktreeRootForRepo: vi.fn().mockResolvedValue(undefined)
}))

const dirLinkType = process.platform === 'win32' ? 'junction' : 'dir'

function createStore(repos: Repo[]): Store {
  const store = {
    getRepos: () => repos,
    addRepo: (repo: Repo) => {
      repos.push(repo)
    }
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: addLocalRepoFromPath only calls getRepos/addRepo.
  return store as unknown as Store
}

describe('addLocalRepoFromPath for a subfolder of a Git repository', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'orca-local-add-subfolder-'))
    execFileSync('git', ['init', '-q'], { cwd: root })
    await mkdir(join(root, 'workspace'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('refuses to register a subfolder as its enclosing repository', async () => {
    const repos: Repo[] = []

    const result = await addLocalRepoFromPath(createStore(repos), join(root, 'workspace'), 'git')

    expect(result).toHaveProperty('error')
    expect(repos).toHaveLength(0)
  })

  it('still registers the repository root as a Git project', async () => {
    const repos: Repo[] = []

    const result = await addLocalRepoFromPath(createStore(repos), root, 'git')

    expect(result).toHaveProperty('repo')
    expect(repos).toHaveLength(1)
  })

  it('registers the same subfolder as a plain folder', async () => {
    const repos: Repo[] = []

    await addLocalRepoFromPath(createStore(repos), join(root, 'workspace'), 'folder')

    expect(repos).toHaveLength(1)
    expect(repos[0]?.path).toBe(join(root, 'workspace'))
  })

  it('marks a folder opened at a Git root so it is not auto-upgraded, but not a subfolder', async () => {
    const repos: Repo[] = []
    const store = createStore(repos)

    await addLocalRepoFromPath(store, root, 'folder')
    await addLocalRepoFromPath(store, join(root, 'workspace'), 'folder')

    expect(repos.find((repo) => repo.path === root)?.keepAsFolder).toBe(true)
    expect(repos.find((repo) => repo.path !== root)?.keepAsFolder).toBeUndefined()
  })
})

describe('addLocalRepoFromPath through a symlink alias', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'orca-local-add-alias-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('returns the tracked folder workspace instead of adding a duplicate', async () => {
    const folderPath = join(root, 'notes')
    await mkdir(folderPath)
    await symlink(folderPath, join(root, 'notes-link'), dirLinkType)
    const repos: Repo[] = []
    const store = createStore(repos)

    const first = await addLocalRepoFromPath(store, folderPath, 'folder')
    const second = await addLocalRepoFromPath(store, join(root, 'notes-link'), 'folder')

    expect('repo' in first && 'repo' in second && second.repo.id === first.repo.id).toBe(true)
    expect(second).toMatchObject({ alreadyExisted: true })
    expect(repos).toHaveLength(1)
  })

  it('keeps two different folders as two workspaces', async () => {
    await mkdir(join(root, 'a'))
    await mkdir(join(root, 'b'))
    const repos: Repo[] = []
    const store = createStore(repos)

    await addLocalRepoFromPath(store, join(root, 'a'), 'folder')
    await addLocalRepoFromPath(store, join(root, 'b'), 'folder')

    expect(repos).toHaveLength(2)
  })
})
