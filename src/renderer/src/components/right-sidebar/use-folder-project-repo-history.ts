import { useCallback, useEffect, useRef, useState } from 'react'
import { getRuntimeGitHistory } from '@/runtime/source-control/git/runtime-git-status-client'
import type { GitHistoryPanelState } from './source-control/sync/git-history-panel'

const HISTORY_LIMIT = 50
const HISTORY_REFRESH_MS = 30_000

/** Commit graph of one sub-repo; reloads on selection, expand, a HEAD change and a slow timer. */
export function useFolderProjectRepoHistory(
  repoPath: string | null,
  head: string | undefined,
  enabled: boolean
): { state: GitHistoryPanelState; refresh: () => Promise<void> } {
  const [stateByRepo, setStateByRepo] = useState<Record<string, GitHistoryPanelState>>({})
  const requestSeqRef = useRef(0)

  const refresh = useCallback(async (): Promise<void> => {
    if (!repoPath) {
      return
    }
    const requestId = ++requestSeqRef.current
    setStateByRepo((prev) => {
      const previous = prev[repoPath]
      return {
        ...prev,
        [repoPath]: previous?.result
          ? { status: 'refreshing', result: previous.result }
          : { status: 'loading' }
      }
    })
    try {
      const result = await getRuntimeGitHistory(
        { target: { kind: 'local' }, worktreeId: null, worktreePath: repoPath },
        { limit: HISTORY_LIMIT }
      )
      if (requestSeqRef.current === requestId) {
        setStateByRepo((prev) => ({ ...prev, [repoPath]: { status: 'ready', result } }))
      }
    } catch (error) {
      if (requestSeqRef.current !== requestId) {
        return
      }
      const message = error instanceof Error ? error.message : 'Failed to load commits'
      setStateByRepo((prev) => {
        const previous = prev[repoPath]
        return {
          ...prev,
          [repoPath]: previous?.result
            ? { status: 'error', result: previous.result, error: message }
            : { status: 'error', error: message }
        }
      })
    }
  }, [repoPath])

  useEffect(() => {
    if (!enabled || !repoPath) {
      return
    }
    void refresh()
    const timer = setInterval(() => void refresh(), HISTORY_REFRESH_MS)
    return () => clearInterval(timer)
  }, [enabled, refresh, repoPath, head])

  const idle: GitHistoryPanelState = { status: 'idle' }
  return { state: repoPath ? (stateByRepo[repoPath] ?? idle) : idle, refresh }
}
