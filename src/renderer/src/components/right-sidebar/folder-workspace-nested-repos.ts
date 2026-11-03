import { normalizeRuntimePathForComparison } from '../../../../shared/cross-platform-path'
import type { Repo } from '../../../../shared/repo-types'

type NestedRepoCandidate = Pick<Repo, 'id' | 'path' | 'kind' | 'connectionId' | 'executionHostId'>

/**
 * Returns the local Git projects whose path lives strictly inside a folder workspace.
 * Why: a plain folder (e.g. a monorepo parent) can hold several independent repos; the
 * Repos panel lists them so each one's state is visible without leaving the folder.
 */
export function getGitReposInsideFolder<T extends NestedRepoCandidate>(
  repos: readonly T[],
  folderPath: string
): T[] {
  const root = normalizeRuntimePathForComparison(folderPath).replace(/\/+$/, '')
  const prefix = `${root}/`
  return repos
    .filter((repo) => repo.kind !== 'folder' && !repo.connectionId && (!repo.executionHostId || repo.executionHostId === 'local'))
    .filter((repo) => normalizeRuntimePathForComparison(repo.path).startsWith(prefix))
    .sort((a, b) => a.path.localeCompare(b.path))
}
