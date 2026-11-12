import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { useActiveWorktree } from '@/store/workspaces/selection/use-selected-worktree'
import { useRepoById } from '@/store/repos/use-repository-catalog'
import type { GitStatusEntry } from '../../../../shared/git/status/git-status-types'
import { openUncommittedEntry } from './source-control/listing/open-uncommitted-entry'
import { GitHistoryPanel } from './source-control/sync/git-history-panel'
import { RepoChanges } from './FolderProjectRepoChanges'
import {
  getFolderProjectBranchLabel,
  type FolderProjectRepoSnapshot
} from './folder-project-repo-git'
import { useFolderProjectSubRepos, type FolderProjectSubRepo } from './folder-project-sub-repos'
import { useFolderProjectRepoStatus } from './use-folder-project-repo-status'
import { useFolderProjectRepoHistory } from './use-folder-project-repo-history'

const SECTION_TITLE = 'px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground'

function RepositoryRow({
  repo,
  snapshot,
  selected,
  onSelect
}: {
  repo: FolderProjectSubRepo
  snapshot: FolderProjectRepoSnapshot | undefined
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const count = snapshot?.status.entries.length ?? 0
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`flex w-full items-center gap-2 px-3 py-0.5 text-left text-xs hover:bg-accent/50 ${selected ? 'bg-accent' : ''}`}
      onClick={onSelect}
    >
      <span className="min-w-0 truncate">{repo.name}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground">
        <GitBranch className="size-3" />
        {getFolderProjectBranchLabel(snapshot?.status.branch)}
        {count > 0 ? <span className="tabular-nums">{`·${count}`}</span> : null}
      </span>
    </button>
  )
}

function Message({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  )
}

export default function FolderProjectSourceControlPanel(): React.JSX.Element {
  const activeWorktree = useActiveWorktree()
  const activeRepo = useRepoById(activeWorktree?.repoId ?? null)
  const activeWorktreeId = activeWorktree?.id ?? null
  const isLocal = activeRepo !== null && activeRepo !== undefined && !activeRepo.connectionId
  const folderPath = isLocal ? (activeRepo?.path ?? null) : null

  const { repos, loading } = useFolderProjectSubRepos(folderPath, isLocal)
  const { snapshots, refreshRepo } = useFolderProjectRepoStatus(repos, isLocal)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [historyCollapsed, setHistoryCollapsed] = useState(false)
  const selected = repos.find((repo) => repo.path === selectedPath) ?? repos[0] ?? null
  const history = useFolderProjectRepoHistory(
    selected?.path ?? null,
    snapshots[selected?.path ?? '']?.status.head,
    !historyCollapsed
  )

  // The diff tab stays in this workspace: its git root is derived from the absolute path.
  const openEntry = (repo: FolderProjectSubRepo, entry: GitStatusEntry): void => {
    if (activeWorktreeId) {
      openUncommittedEntry(useAppStore.getState(), activeWorktreeId, repo.path, entry)
    }
  }

  if (!isLocal) {
    return (
      <Message
        text={translate(
          'auto.components.right.sidebar.folderSourceControl.localOnly',
          'Source Control for folders is only available on this computer.'
        )}
      />
    )
  }
  if (repos.length === 0) {
    return (
      <Message
        text={
          loading
            ? translate(
                'auto.components.right.sidebar.folderSourceControl.scanning',
                'Looking for Git repositories…'
              )
            : translate(
                'auto.components.right.sidebar.folderSourceControl.empty',
                'No Git repositories found in this folder.'
              )
        }
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto py-1">
        <div className={SECTION_TITLE}>
          {translate(
            'auto.components.right.sidebar.folderSourceControl.repositories',
            'Repositories'
          )}
        </div>
        {repos.map((repo) => (
          <RepositoryRow
            key={repo.path}
            repo={repo}
            snapshot={snapshots[repo.path]}
            selected={repo.path === selected?.path}
            onSelect={() => setSelectedPath(repo.path)}
          />
        ))}
        <div className={`mt-2 ${SECTION_TITLE}`}>
          {translate('auto.components.right.sidebar.folderSourceControl.changes', 'Changes')}
        </div>
        {repos.map((repo) => (
          <RepoChanges
            key={repo.path}
            repo={repo}
            snapshot={snapshots[repo.path]}
            onChanged={() => refreshRepo(repo.path)}
            onOpen={openEntry}
          />
        ))}
      </div>
      <div className="shrink-0 border-t border-border">
        <div className={`truncate pt-1 ${SECTION_TITLE}`}>
          {`${translate('auto.components.right.sidebar.folderSourceControl.graph', 'Graph')} · ${selected?.name ?? ''}`}
        </div>
        <GitHistoryPanel
          state={history.state}
          collapsed={historyCollapsed}
          onToggle={() => setHistoryCollapsed((value) => !value)}
          onRefresh={() => void history.refresh()}
        />
      </div>
    </div>
  )
}
