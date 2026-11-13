import { translate } from '@/i18n/i18n'
import type { BranchSwitchTarget } from '../../../../../shared/git/branch-switch-target'
import type {
  RuntimeGitLocalBranches,
  RuntimeGitSwitchResult,
  RuntimeRepoSearchRefs
} from '../../../../../shared/runtime-worktree-contracts'
import type { RuntimeGitContext } from './runtime-git-client-context'
import { callRuntimeRpc } from '../../rpc/calls/runtime-rpc-call'
import { RuntimeRpcCallError } from '../../rpc/calls/runtime-rpc-result'
import { toRuntimeWorktreeSelector } from '../../rpc/targets/runtime-worktree-selector'

export async function switchRuntimeGitBranch(
  context: RuntimeGitContext,
  target: BranchSwitchTarget,
  hostLabel = context.target.kind === 'environment'
    ? context.target.environmentId
    : translate('sourceControl.branchPicker.thisComputer', 'this computer'),
  beforeSend?: () => void
): Promise<RuntimeGitSwitchResult> {
  if (!context.worktreeId) {
    return window.api.git.switchBranch({ worktreePath: context.worktreePath, target })
  }
  try {
    const params = { worktree: toRuntimeWorktreeSelector(context.worktreeId ?? ''), target }
    return await (beforeSend
      ? callRuntimeRpc<RuntimeGitSwitchResult>(context.target, 'git.switchBranch', params, {
          beforeSend
        })
      : callRuntimeRpc<RuntimeGitSwitchResult>(context.target, 'git.switchBranch', params))
  } catch (error) {
    if (error instanceof RuntimeRpcCallError && error.code === 'method_not_found') {
      throw new Error(
        translate(
          'sourceControl.branchPicker.updateHost',
          'Update Orca on {{host}} to switch branches from here.',
          { host: hostLabel }
        )
      )
    }
    throw error
  }
}
export function listRuntimeGitBranches(
  context: RuntimeGitContext
): Promise<RuntimeGitLocalBranches> {
  if (!context.worktreeId) {
    return window.api.git.localBranches({ worktreePath: context.worktreePath })
  }
  return callRuntimeRpc(context.target, 'git.localBranches', {
    worktree: toRuntimeWorktreeSelector(context.worktreeId ?? '')
  })
}
export function searchRuntimeRemoteBranches(
  context: RuntimeGitContext,
  repoId: string,
  query: string
): Promise<RuntimeRepoSearchRefs> {
  // A sub-repo has no registered repo to search; local branches and new branches still work.
  if (!context.worktreeId) {
    return Promise.resolve({ namespace: 'remote', refs: [], truncated: false })
  }
  return callRuntimeRpc(context.target, 'repo.searchRefs', {
    repo: repoId,
    query,
    limit: 50,
    namespace: 'remote'
  })
}
export function branchSwitchExistingBranch(error: unknown): string | null {
  if (!(error instanceof RuntimeRpcCallError)) {
    return null
  }
  const data = error.response.error.data
  return typeof data === 'object' &&
    data !== null &&
    'existingBranch' in data &&
    typeof data.existingBranch === 'string'
    ? data.existingBranch
    : null
}
