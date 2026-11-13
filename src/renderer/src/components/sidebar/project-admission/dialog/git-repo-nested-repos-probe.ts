import type { AppState } from '@/store/types'

const NESTED_REPO_PROBE_DEPTH = 3
const NESTED_REPO_PROBE_LIMIT = 20

async function countReposInsideGitRepo(path: string): Promise<number> {
  try {
    const scan = await window.api.projectGroups.scanNested({
      path,
      options: {
        maxDepth: NESTED_REPO_PROBE_DEPTH,
        maxRepos: NESTED_REPO_PROBE_LIMIT,
        scanInsideGitRepo: true
      }
    })
    return scan.repos.length
  } catch {
    return 0
  }
}

export async function promptWhenGitRepoHoldsRepos(args: {
  path: string
  openModal: AppState['openModal']
  closeModal: () => void
  isCurrent: () => boolean
}): Promise<'none' | 'cancelled' | 'prompted'> {
  const containsRepos = await countReposInsideGitRepo(args.path)
  if (!args.isCurrent()) {
    return 'cancelled'
  }
  if (containsRepos === 0) {
    return 'none'
  }
  args.closeModal()
  args.openModal('confirm-non-git-folder', { folderPath: args.path, containsRepos })
  return 'prompted'
}
