import type { GitUpstreamStatus } from '../../../../shared/git/status/git-status-types'

export type FolderProjectRepoSyncAction = 'publish' | 'push' | 'pull' | 'sync' | null

/** VS Code's sync button semantics: publish an unpublished branch, otherwise pull/push whichever side is ahead. */
export function getFolderProjectRepoSyncAction(
  upstream: GitUpstreamStatus | undefined
): FolderProjectRepoSyncAction {
  if (!upstream) {
    return null
  }
  if (!upstream.hasUpstream) {
    return upstream.hasConfiguredPushTarget ? 'push' : 'publish'
  }
  if (upstream.ahead > 0 && upstream.behind > 0) {
    return 'sync'
  }
  if (upstream.behind > 0) {
    return 'pull'
  }
  return upstream.ahead > 0 ? 'push' : null
}
