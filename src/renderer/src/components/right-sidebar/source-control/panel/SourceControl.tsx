import React from 'react'
import { useActiveWorktree } from '@/store/workspaces/selection/use-selected-worktree'
import { useRepoById } from '@/store/repos/use-repository-catalog'
import { isFolderRepo } from '../../../../../../shared/repo-kind'
import { lazyWithRetry as lazy } from '@/app-shell/startup/lazy-with-retry'
import { SourceControlPanel } from './panel'

const FolderProjectSourceControlPanel = lazy(() => import('../../FolderProjectSourceControlPanel'))

import '../review/hosted-review-header-chrome'

import '../sync/compare-summary'
import '../listing/conflict-status-cards'
import '../listing/too-many-changes-banner'
import '../listing/action-button'
import '../sync/use-branch-compare'
import '../commit/commit-area'
import '../commit/commit-shortcut'

import '../commit/commit-drafts'
import '../commit/component-gates'
import '../sync/remote-refresh'

import '../ai/text-generation-defaults'

function SourceControlInner(): React.JSX.Element {
  const activeWorktree = useActiveWorktree()
  const activeRepo = useRepoById(activeWorktree?.repoId ?? null)
  return activeRepo && isFolderRepo(activeRepo) ? (
    <FolderProjectSourceControlPanel />
  ) : (
    <SourceControlPanel />
  )
}
const SourceControl = React.memo(SourceControlInner)
export default SourceControl
