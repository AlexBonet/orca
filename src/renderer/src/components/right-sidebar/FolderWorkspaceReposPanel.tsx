import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, GitBranch, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { selectFolderWorkspaces, selectWorktreesByRepo } from '@/store/workspace-record-selectors'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import { getGitReposInsideFolder } from './folder-workspace-nested-repos'

type RepoSummary = {
  branch: string | null
  changes: number
  ahead: number
  behind: number
  error: boolean
}

export default function FolderWorkspaceReposPanel(): React.JSX.Element {
  const activeWorkspaceKey = useAppStore((s) => s.activeWorkspaceKey)
  const folderWorkspaces = useAppStore((s) => selectFolderWorkspaces(s))
  const worktreesByRepo = useAppStore((s) => selectWorktreesByRepo(s))
  const repos = useAppStore((s) => s.repos)
  const setRightSidebarTab = useAppStore((s) => s.setRightSidebarTab)
  const [summaries, setSummaries] = useState<Record<string, RepoSummary>>({})
  const [refreshing, setRefreshing] = useState(false)

  const scope = parseWorkspaceKey(activeWorkspaceKey ?? '')
  const folderWorkspace =
    scope?.type === 'folder'
      ? (folderWorkspaces.find((w) => w.id === scope.folderWorkspaceId) ?? null)
      : null

  const nestedRepos = useMemo(
    () => (folderWorkspace ? getGitReposInsideFolder(repos, folderWorkspace.folderPath) : []),
    [repos, folderWorkspace]
  )

  const mainWorktreeOf = useCallback(
    (repoId: string) => (worktreesByRepo[repoId] ?? []).find((w) => w.isMainWorktree) ?? null,
    [worktreesByRepo]
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    const next: Record<string, RepoSummary> = {}
    await Promise.all(
      nestedRepos.map(async (repo) => {
        try {
          const status = await window.api.git.status({
            worktreePath: repo.path,
            admissionTier: 'background'
          })
          next[repo.id] = {
            branch: status.branch ?? null,
            changes: status.entries.length,
            ahead: status.upstreamStatus?.ahead ?? 0,
            behind: status.upstreamStatus?.behind ?? 0,
            error: false
          }
        } catch {
          next[repo.id] = { branch: null, changes: 0, ahead: 0, behind: 0, error: true }
        }
      })
    )
    setSummaries(next)
    setRefreshing(false)
  }, [nestedRepos])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const openRepo = (repoId: string): void => {
    const main = mainWorktreeOf(repoId)
    if (!main) {
      return
    }
    activateAndRevealWorktree(main.id)
    setRightSidebarTab('source-control')
  }

  if (!folderWorkspace) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {translate(
          'auto.components.rightSidebar.FolderWorkspaceReposPanel.unavailable',
          'Repos are only shown for folder workspaces.'
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{folderWorkspace.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {translate(
              'auto.components.rightSidebar.FolderWorkspaceReposPanel.count',
              '{{count}} Git repos inside this folder',
              { count: nestedRepos.length, defaultValue_one: '{{count}} Git repo inside this folder' }
            )}
          </div>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => void refresh()}
          aria-label={translate('auto.components.rightSidebar.FolderWorkspaceReposPanel.refresh', 'Refresh')}
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {nestedRepos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="text-sm font-medium text-foreground">
            {translate(
              'auto.components.rightSidebar.FolderWorkspaceReposPanel.emptyTitle',
              'No Git repos found'
            )}
          </div>
          <div className="mt-2 max-w-[16rem] text-xs leading-5 text-muted-foreground">
            {translate(
              'auto.components.rightSidebar.FolderWorkspaceReposPanel.emptyCopy',
              'Add the repositories inside this folder as projects and they will show up here.'
            )}
          </div>
        </div>
      ) : (
        <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto py-2 pl-1 pr-2">
          <div className="space-y-1">
            {nestedRepos.map((repo) => {
              const summary = summaries[repo.id]
              const canOpen = mainWorktreeOf(repo.id) !== null
              return (
                <button
                  key={repo.id}
                  type="button"
                  disabled={!canOpen}
                  onClick={() => openRepo(repo.id)}
                  className="flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-accent disabled:opacity-60"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {repo.displayName}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1">
                      <GitBranch className="size-3 shrink-0" />
                      <span className="truncate">{summary?.branch ?? (summary?.error ? '—' : '…')}</span>
                    </span>
                    {summary && !summary.error ? (
                      <>
                        <span>
                          {translate(
                            'auto.components.rightSidebar.FolderWorkspaceReposPanel.changes',
                            '{{count}} changes',
                            { count: summary.changes, defaultValue_one: '{{count}} change' }
                          )}
                        </span>
                        {summary.ahead > 0 && (
                          <span className="flex items-center">
                            <ArrowUp className="size-3" />
                            {summary.ahead}
                          </span>
                        )}
                        {summary.behind > 0 && (
                          <span className="flex items-center">
                            <ArrowDown className="size-3" />
                            {summary.behind}
                          </span>
                        )}
                      </>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
