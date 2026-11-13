import type { RuntimeGitContext } from '@/runtime/source-control/git/runtime-git-client-context'
import { getRuntimeGitStatus } from '@/runtime/source-control/git/runtime-git-status-client'
import {
  bulkDiscardRuntimeGitPaths,
  bulkStageRuntimeGitPaths,
  bulkUnstageRuntimeGitPaths,
  discardRuntimeGitPath,
  stageRuntimeGitPath,
  unstageRuntimeGitPath
} from '@/runtime/source-control/git/runtime-git-working-tree-client'
import {
  commitRuntimeGit,
  fetchRuntimeGit,
  getRuntimeGitUpstreamStatus,
  pullRuntimeGit,
  pushRuntimeGit
} from '@/runtime/source-control/git/runtime-git-sync-client'
import type {
  GitStatusResult,
  GitUpstreamStatus
} from '../../../../shared/git/status/git-status-types'
import type { FolderProjectRepoSyncAction } from './folder-project-repo-sync-state'

// Sub-repos are not Orca worktrees: no worktree id, so every call takes the direct local-path route.
function localRepoContext(repoPath: string): RuntimeGitContext {
  return { target: { kind: 'local' }, worktreeId: null, worktreePath: repoPath }
}

export type FolderProjectRepoSnapshot = {
  status: GitStatusResult
  upstream: GitUpstreamStatus | undefined
}

export async function readFolderProjectRepoSnapshot(
  repoPath: string,
  options: { signal?: AbortSignal; background?: boolean } = {}
): Promise<FolderProjectRepoSnapshot> {
  const context = localRepoContext(repoPath)
  const status = await getRuntimeGitStatus(context, {
    admissionTier: options.background ? 'status' : 'interactive',
    ...(options.signal ? { signal: options.signal } : {})
  })
  const upstream =
    status.upstreamStatus ?? (await getRuntimeGitUpstreamStatus(context).catch(() => undefined))
  return { status, upstream }
}

export type FolderProjectRepoOperation =
  | { kind: 'stage'; paths: string[] }
  | { kind: 'unstage'; paths: string[] }
  | { kind: 'discard'; paths: string[] }
  | { kind: 'commit'; message: string }
  | { kind: 'fetch' }
  | { kind: 'sync'; action: Exclude<FolderProjectRepoSyncAction, null> }

export async function runFolderProjectRepoOperation(
  repoPath: string,
  operation: FolderProjectRepoOperation
): Promise<void> {
  const context = localRepoContext(repoPath)
  switch (operation.kind) {
    case 'stage':
      await (operation.paths.length === 1
        ? stageRuntimeGitPath(context, operation.paths[0])
        : bulkStageRuntimeGitPaths(context, operation.paths))
      return
    case 'unstage':
      await (operation.paths.length === 1
        ? unstageRuntimeGitPath(context, operation.paths[0])
        : bulkUnstageRuntimeGitPaths(context, operation.paths))
      return
    case 'discard':
      await (operation.paths.length === 1
        ? discardRuntimeGitPath(context, operation.paths[0])
        : bulkDiscardRuntimeGitPaths(context, operation.paths))
      return
    case 'commit': {
      const result = await commitRuntimeGit(context, operation.message)
      if (!result.success) {
        throw new Error(result.error || 'Commit failed')
      }
      return
    }
    case 'fetch':
      await fetchRuntimeGit(context)
      return
    case 'sync':
      if (operation.action === 'pull' || operation.action === 'sync') {
        await pullRuntimeGit(context)
      }
      if (operation.action !== 'pull') {
        await pushRuntimeGit(context, operation.action === 'publish' ? { publish: true } : {})
      }
  }
}

export function getFolderProjectBranchLabel(branch: string | undefined): string {
  return branch?.replace(/^refs\/heads\//, '') ?? ''
}
