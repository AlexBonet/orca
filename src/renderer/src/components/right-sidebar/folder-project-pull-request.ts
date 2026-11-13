import type {
  CreateHostedReviewResult,
  HostedReviewCreationEligibility
} from '../../../../shared/source-control/hosted-review/hosted-review-contracts'
import type { GitUpstreamStatus } from '../../../../shared/git/status/git-status-types'
import { runFolderProjectRepoOperation } from './folder-project-repo-git'

export function readFolderProjectPullRequestEligibility(
  repoPath: string,
  branch: string,
  upstream: GitUpstreamStatus | undefined,
  hasUncommittedChanges: boolean
): Promise<HostedReviewCreationEligibility> {
  return window.api.hostedReview.getCreationEligibilityForPath({
    path: repoPath,
    branch,
    hasUpstream: upstream?.hasUpstream,
    ahead: upstream?.ahead,
    behind: upstream?.behind,
    hasUncommittedChanges
  })
}

/** Reviews are created from the remote branch, so an unpublished or ahead branch is pushed first. */
export async function createFolderProjectPullRequest(args: {
  repoPath: string
  branch: string
  base: string
  title: string
  body: string
  eligibility: HostedReviewCreationEligibility
  upstream: GitUpstreamStatus | undefined
}): Promise<CreateHostedReviewResult> {
  const { eligibility } = args
  if (eligibility.blockedReason === 'needs_push' || eligibility.blockedReason === 'no_upstream') {
    await runFolderProjectRepoOperation(args.repoPath, {
      kind: 'sync',
      action: args.upstream?.hasUpstream ? 'push' : 'publish'
    })
  }
  return window.api.hostedReview.createForPath({
    path: args.repoPath,
    input: {
      provider: eligibility.provider,
      base: args.base,
      head: args.branch,
      title: args.title,
      body: args.body
    }
  })
}
