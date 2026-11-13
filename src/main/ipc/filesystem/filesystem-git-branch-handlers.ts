import { ipcMain } from 'electron'
import { BranchSwitchLandedWithWarningError, switchBranchGuarded } from '../../git/branch-switch'
import { createLocalGitProvider } from '../../providers/local-git-provider'
import { resolveRegisteredWorktreePath } from '../worktrees/removal/registered-worktree-roots-cache'
import { getLocalGitOptionsForRegisteredWorktree } from '../local-worktree-runtime-options'
import type { BranchSwitchTarget } from '../../../shared/git/branch-switch-target'
import type {
  RuntimeGitLocalBranches,
  RuntimeGitSwitchResult
} from '../../../shared/runtime-worktree-contracts'
import type { FilesystemHandlerContext } from './filesystem-handler-context'

const SWITCH_TARGET_KINDS = new Set(['local', 'remote', 'new'])

function assertBranchSwitchTarget(target: BranchSwitchTarget): void {
  if (!SWITCH_TARGET_KINDS.has(target?.kind) || typeof target.name !== 'string') {
    throw new Error('Unknown branch target')
  }
}

/** Branch list and switch by path, for repos that are not registered Orca worktrees. */
export function registerFilesystemGitBranchHandlers(context: FilesystemHandlerContext): void {
  const { store } = context
  const resolveLocalRepo = async (requestedPath: string) => {
    const worktreePath = await resolveRegisteredWorktreePath(requestedPath, store)
    const gitOptions = getLocalGitOptionsForRegisteredWorktree(store, requestedPath, worktreePath)
    return { worktreePath, gitOptions }
  }

  ipcMain.handle(
    'git:localBranches',
    async (_event, args: { worktreePath: string }): Promise<RuntimeGitLocalBranches> => {
      const { worktreePath, gitOptions } = await resolveLocalRepo(args.worktreePath)
      return createLocalGitProvider(gitOptions).listLocalBranches(worktreePath)
    }
  )

  ipcMain.handle(
    'git:switchBranch',
    async (
      _event,
      args: { worktreePath: string; target: BranchSwitchTarget }
    ): Promise<RuntimeGitSwitchResult> => {
      assertBranchSwitchTarget(args.target)
      const { worktreePath, gitOptions } = await resolveLocalRepo(args.worktreePath)
      const provider = createLocalGitProvider(gitOptions)
      try {
        const result = await switchBranchGuarded(worktreePath, args.target, gitOptions, {
          getStatus: () =>
            provider.getStatus(worktreePath, {
              admissionTier: 'interactive',
              includeLineStats: false
            }),
          checkout: (branch, creation) => provider.checkoutBranch(worktreePath, branch, creation),
          getAgentBlocker: async () => null
        })
        return { ok: true, branch: result.branch, head: result.head }
      } catch (error) {
        if (error instanceof BranchSwitchLandedWithWarningError) {
          return { ok: true, branch: error.branch, head: error.head, warning: error.message }
        }
        throw error
      }
    }
  )
}
