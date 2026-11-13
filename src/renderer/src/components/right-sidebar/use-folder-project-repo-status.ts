import { useCallback, useEffect, useRef, useState } from 'react'
import {
  readFolderProjectRepoSnapshot,
  type FolderProjectRepoSnapshot
} from './folder-project-repo-git'
import type { FolderProjectSubRepo } from './folder-project-sub-repos'

const REPO_STATUS_REFRESH_MS = 10_000

export type FolderProjectRepoSnapshots = Record<string, FolderProjectRepoSnapshot | undefined>

/** Local state, not the worktree git slices: sub-repos have no worktree id for those to key on. */
export function useFolderProjectRepoStatus(
  repos: readonly FolderProjectSubRepo[],
  enabled: boolean
): { snapshots: FolderProjectRepoSnapshots; refreshRepo: (repoPath: string) => Promise<void> } {
  const [snapshots, setSnapshots] = useState<FolderProjectRepoSnapshots>({})
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshRepo = useCallback(async (repoPath: string, background = false): Promise<void> => {
    try {
      const snapshot = await readFolderProjectRepoSnapshot(repoPath, { background })
      if (mountedRef.current) {
        setSnapshots((previous) => ({ ...previous, [repoPath]: snapshot }))
      }
    } catch (error) {
      console.warn('[FolderSourceControl] git status refresh failed', repoPath, error)
    }
  }, [])

  const repoKey = repos.map((repo) => repo.path).join('|')
  useEffect(() => {
    if (!enabled || repos.length === 0) {
      return
    }
    const refreshAll = (): void => {
      for (const repo of repos) {
        void refreshRepo(repo.path, true)
      }
    }
    refreshAll()
    const timer = setInterval(refreshAll, REPO_STATUS_REFRESH_MS)
    return () => clearInterval(timer)
    // repoKey stands in for repos: the array identity changes on every scan.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, repoKey, refreshRepo])

  return { snapshots, refreshRepo: (repoPath) => refreshRepo(repoPath) }
}
