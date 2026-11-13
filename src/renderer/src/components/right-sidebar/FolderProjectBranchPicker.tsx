import { useMemo } from 'react'
import { translate } from '@/i18n/i18n'
import type { RuntimeGitContext } from '@/runtime/source-control/git/runtime-git-client-context'
import { BranchPicker } from './source-control/branches/BranchPicker'
import type { BranchWorkspace } from './source-control/branches/branch-picker-rows'

const NO_WORKSPACES: ReadonlyMap<string, BranchWorkspace> = new Map()
const IGNORE_WORKSPACE_OPEN = (): void => {}

/** The Git panel's branch picker bound to a sub-repo path, so it can switch and create branches without a worktree. */
export function FolderProjectBranchPicker({
  repoPath,
  repoName,
  projectRepoId,
  branch,
  onSwitched
}: {
  repoPath: string
  repoName: string
  projectRepoId: string
  branch: string
  onSwitched: () => void
}): React.JSX.Element {
  const context = useMemo<RuntimeGitContext>(
    () => ({ target: { kind: 'local' }, worktreeId: null, worktreePath: repoPath }),
    [repoPath]
  )
  return (
    <BranchPicker
      context={context}
      repoId={projectRepoId}
      hostId="local"
      hostLabel={translate('sourceControl.branchPicker.thisComputer', 'this computer')}
      workspaceLabel={repoName}
      workspaces={NO_WORKSPACES}
      onOpenWorkspace={IGNORE_WORKSPACE_OPEN}
      onSwitched={onSwitched}
      branch={branch}
      blocker={null}
    />
  )
}
