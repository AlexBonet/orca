import { ipcMain } from 'electron'
import type { Store } from '../../persistence/loading-store/store'
import {
  createHostedReview,
  getHostedReviewCreationEligibility
} from '../../source-control/hosted-review-creation'
import type {
  CreateHostedReviewInput,
  CreateHostedReviewResult,
  HostedReviewCreationEligibility
} from '../../../shared/source-control/hosted-review/hosted-review-contracts'
import { LOCAL_EXECUTION_HOST_ID } from '../../../shared/execution-host'
import { resolveRegisteredWorktreePath } from '../worktrees/removal/registered-worktree-roots-cache'

export type HostedReviewEligibilityForPathArgs = {
  path: string
  branch: string
  base?: string | null
  hasUpstream?: boolean
  ahead?: number
  behind?: number
  hasUncommittedChanges?: boolean
}

const LOCAL_GIT = { localGitExecOptions: { admissionTier: 'interactive' as const } }

/** Pull request checks and creation for a local repo that is not a registered Orca repo (a folder project's sub-repo). */
export function registerHostedReviewByPathHandlers(store: Store): void {
  ipcMain.handle(
    'hostedReview:getCreationEligibilityForPath',
    async (
      _event,
      args: HostedReviewEligibilityForPathArgs
    ): Promise<HostedReviewCreationEligibility> => {
      const repoPath = await resolveRegisteredWorktreePath(args.path, store)
      return getHostedReviewCreationEligibility({
        repoPath,
        branch: args.branch,
        base: args.base,
        hasUpstream: args.hasUpstream,
        ahead: args.ahead,
        behind: args.behind,
        hasUncommittedChanges: args.hasUncommittedChanges,
        executionHostId: LOCAL_EXECUTION_HOST_ID,
        ...LOCAL_GIT
      })
    }
  )

  ipcMain.handle(
    'hostedReview:createForPath',
    async (
      _event,
      args: { path: string; input: CreateHostedReviewInput }
    ): Promise<CreateHostedReviewResult> => {
      const repoPath = await resolveRegisteredWorktreePath(args.path, store)
      const { provider, base, head, title, body, draft } = args.input
      return createHostedReview(
        repoPath,
        { provider, base, head, title, body, draft },
        LOCAL_EXECUTION_HOST_ID,
        LOCAL_GIT
      )
    }
  )
}
