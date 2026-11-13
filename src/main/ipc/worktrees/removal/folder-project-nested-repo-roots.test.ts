import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Repo } from '../../../../shared/repo-types'
import { findNestedFolderRepoRoot } from './folder-project-nested-repo-roots'

let root: string

function makeRepo(dir: string): void {
  mkdirSync(join(dir, '.git', 'objects'), { recursive: true })
  mkdirSync(join(dir, '.git', 'refs'), { recursive: true })
  writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
}

const folderProject = (path: string, extra: Partial<Repo> = {}): Repo =>
  ({
    id: 'p1',
    path,
    kind: 'folder',
    displayName: 'p',
    badgeColor: '#000',
    addedAt: 0,
    ...extra
  }) as Repo

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nested-repo-roots-')))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('findNestedFolderRepoRoot', () => {
  it('accepts a child repo root inside a folder project', async () => {
    const folder = join(root, 'pou')
    makeRepo(join(folder, 'pou-android'))
    expect(
      await findNestedFolderRepoRoot(join(folder, 'pou-android'), [folderProject(folder)])
    ).toBe(join(folder, 'pou-android'))
  })

  it('accepts the folder itself only when it was opened at a Git root on purpose', async () => {
    const folder = join(root, 'pou')
    makeRepo(folder)
    expect(await findNestedFolderRepoRoot(folder, [folderProject(folder)])).toBeNull()
    expect(
      await findNestedFolderRepoRoot(folder, [folderProject(folder, { keepAsFolder: true })])
    ).toBe(folder)
  })

  it('rejects a plain folder even when opened on purpose, plus plain subfolders and paths inside a repo', async () => {
    const folder = join(root, 'pou')
    makeRepo(join(folder, 'web'))
    mkdirSync(join(folder, 'notes'), { recursive: true })
    const repos = [folderProject(folder, { keepAsFolder: true })]
    expect(await findNestedFolderRepoRoot(folder, repos)).toBeNull()
    expect(await findNestedFolderRepoRoot(join(folder, 'notes'), repos)).toBeNull()
    expect(await findNestedFolderRepoRoot(join(folder, 'web', 'src'), repos)).toBeNull()
  })

  it('rejects repos outside the folder, including through a symlink', async () => {
    const folder = join(root, 'pou')
    mkdirSync(folder, { recursive: true })
    makeRepo(join(root, 'elsewhere'))
    symlinkSync(join(root, 'elsewhere'), join(folder, 'link'))
    const repos = [folderProject(folder)]
    expect(await findNestedFolderRepoRoot(join(root, 'elsewhere'), repos)).toBeNull()
    expect(await findNestedFolderRepoRoot(join(folder, 'link'), repos)).toBeNull()
  })

  it('ignores git projects and remote folder projects', async () => {
    const folder = join(root, 'pou')
    makeRepo(join(folder, 'api'))
    const target = join(folder, 'api')
    expect(
      await findNestedFolderRepoRoot(target, [folderProject(folder, { kind: 'git' })])
    ).toBeNull()
    expect(
      await findNestedFolderRepoRoot(target, [folderProject(folder, { connectionId: 'ssh-1' })])
    ).toBeNull()
  })
})
