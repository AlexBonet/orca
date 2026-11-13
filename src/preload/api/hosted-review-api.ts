import type {
  BitbucketConnectArgs,
  BitbucketConnectResult,
  BitbucketConnectionStatus
} from '../../shared/bitbucket-credentials'
import type {
  CreateHostedReviewArgs,
  CreateHostedReviewInput,
  CreateHostedReviewResult,
  CreateStackedHostedReviewArgs,
  CreateStackedHostedReviewResult,
  HostedReviewCreationEligibility,
  HostedReviewCreationEligibilityArgs,
  HostedReviewForBranchArgs,
  HostedReviewForBranchReply,
  HostedReviewInfo
} from '../../shared/source-control/hosted-review/hosted-review-contracts'

export type HostedReviewApi = {
  forBranch: {
    (
      args: HostedReviewForBranchArgs & { reportReadOutcome?: false }
    ): Promise<HostedReviewInfo | null>
    (args: HostedReviewForBranchArgs): Promise<HostedReviewForBranchReply>
  }
  getCreationEligibility: (
    args: HostedReviewCreationEligibilityArgs
  ) => Promise<HostedReviewCreationEligibility>
  /** For a local sub-repo of a folder project, which has no registered repo record. */
  getCreationEligibilityForPath: (args: {
    path: string
    branch: string
    base?: string | null
    hasUpstream?: boolean
    ahead?: number
    behind?: number
    hasUncommittedChanges?: boolean
  }) => Promise<HostedReviewCreationEligibility>
  createForPath: (args: {
    path: string
    input: CreateHostedReviewInput
  }) => Promise<CreateHostedReviewResult>
  create: (args: CreateHostedReviewArgs) => Promise<CreateHostedReviewResult>
  createStacked: (args: CreateStackedHostedReviewArgs) => Promise<CreateStackedHostedReviewResult>
}

export type BitbucketApi = {
  connect: (args: BitbucketConnectArgs) => Promise<BitbucketConnectResult>
  disconnect: () => Promise<void>
  status: () => Promise<BitbucketConnectionStatus>
}
