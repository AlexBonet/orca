import { relative, resolve, sep } from 'node:path'
import type { Repo } from '../../../../shared/repo-types'
import { isFolderRepo } from '../../../../shared/repo-kind'
import { parseWslUncPath } from '../../../../shared/wsl-paths'
import { scanGitMarkerSync } from '../../../git/repo-git-marker-scan'
import {
  isDescendantOrEqual,
  normalizeExistingPath
} from '../../filesystem/access/filesystem-path-containment'

// Matches the deepest nested-repo scan the app offers.
const MAX_NESTED_REPO_DEPTH = 8

/**
 * A folder project is not a Git repo, so its child repos are never listed as worktrees. The user
 * opened the folder, so Git may run in a child that is itself a repo root and really lives inside it.
 */
export async function findNestedFolderRepoRoot(
  target: string,
  repos: Iterable<Repo>
): Promise<string | null> {
  const resolvedTarget = resolve(target)
  // WSL repos need their distro's Git options, which only a registered repo path carries.
  if (parseWslUncPath(resolvedTarget)) {
    return null
  }
  for (const repo of repos) {
    if (!isFolderRepo(repo) || repo.connectionId) {
      continue
    }
    const folderRoot = resolve(repo.path)
    // The folder itself counts only when the user opened a Git root on purpose as a folder.
    const isFolderItself = resolvedTarget === folderRoot
    if (
      !isDescendantOrEqual(resolvedTarget, folderRoot) ||
      (isFolderItself && repo.keepAsFolder !== true)
    ) {
      continue
    }
    // Realpath both sides so a symlinked child cannot point outside the folder.
    const realFolder = await normalizeExistingPath(folderRoot)
    const realTarget = await normalizeExistingPath(resolvedTarget)
    if (!isDescendantOrEqual(realTarget, realFolder)) {
      continue
    }
    if (relative(realFolder, realTarget).split(sep).length > MAX_NESTED_REPO_DEPTH) {
      continue
    }
    const marker = scanGitMarkerSync(realTarget)
    if (marker.status === 'valid' && resolve(marker.rootPath) === realTarget) {
      return realTarget
    }
  }
  return null
}
