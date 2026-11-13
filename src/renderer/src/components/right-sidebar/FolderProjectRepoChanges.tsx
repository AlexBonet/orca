import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GitPullRequest,
  Minus,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CommitMessageComposer } from './source-control/commit/commit-message-composer'
import { useFolderProjectCommitMessage } from './use-folder-project-commit-message'
import { FolderProjectBranchPicker } from './FolderProjectBranchPicker'
import { FileRow, SyncButton } from './FolderProjectRepoRows'
import { FolderProjectPullRequestDialog } from './FolderProjectPullRequestDialog'
import type { Repo } from '../../../../shared/repo-types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import type { GitStatusEntry } from '../../../../shared/git/status/git-status-types'
import type { FolderProjectSubRepo } from './folder-project-sub-repos'
import {
  getFolderProjectBranchLabel,
  runFolderProjectRepoOperation,
  type FolderProjectRepoOperation,
  type FolderProjectRepoSnapshot
} from './folder-project-repo-git'
import { getFolderProjectRepoSyncAction } from './folder-project-repo-sync-state'

const EMPTY_ENTRIES: GitStatusEntry[] = []

type RepoRunner = (operation: FolderProjectRepoOperation) => Promise<boolean>

export function RepoChanges({
  repo,
  projectRepo,
  snapshot,
  onChanged,
  onOpen
}: {
  repo: FolderProjectSubRepo
  projectRepo: Repo | null | undefined
  snapshot: FolderProjectRepoSnapshot | undefined
  onChanged: () => Promise<void>
  onOpen: (repo: FolderProjectSubRepo, entry: GitStatusEntry) => void
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [prOpen, setPrOpen] = useState(false)
  const [pendingDiscard, setPendingDiscard] = useState<string[] | null>(null)
  const entries = snapshot?.status.entries ?? EMPTY_ENTRIES
  const upstream = snapshot?.upstream
  const branch = getFolderProjectBranchLabel(snapshot?.status.branch)
  const staged = entries.filter((entry) => entry.area === 'staged')
  const unstaged = entries.filter((entry) => entry.area !== 'staged')
  const syncAction = getFolderProjectRepoSyncAction(upstream)
  const Chevron = collapsed ? ChevronRight : ChevronDown

  const run: RepoRunner = async (operation) => {
    setBusy(true)
    try {
      await runFolderProjectRepoOperation(repo.path, operation)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      await onChanged()
      setBusy(false)
    }
  }
  const request = (operation: FolderProjectRepoOperation): void => {
    if (operation.kind === 'discard') {
      setPendingDiscard(operation.paths)
      return
    }
    void run(operation)
  }
  const commit = async (): Promise<void> => {
    const text = message.trim()
    if (!text || staged.length === 0) {
      return
    }
    if (await run({ kind: 'commit', message: text })) {
      setMessage('')
    }
  }

  const ai = useFolderProjectCommitMessage({
    repoPath: repo.path,
    projectRepo,
    stagedCount: staged.length,
    hasMessage: message.length > 0,
    busy,
    onMessage: (generated) => setMessage((current) => (current.length > 0 ? current : generated))
  })

  return (
    <div>
      <div className="flex items-center hover:bg-accent/50">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 px-2 py-1 text-left text-xs font-medium"
          onClick={() => setCollapsed((value) => !value)}
        >
          <Chevron className="size-3.5 shrink-0" />
          <span className="truncate">{repo.name}</span>
        </button>
        {branch && projectRepo ? (
          <FolderProjectBranchPicker
            repoPath={repo.path}
            repoName={repo.name}
            projectRepoId={projectRepo.id}
            branch={branch}
            onSwitched={() => void onChanged()}
          />
        ) : null}
        {branch ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={translate(
              'auto.components.right.sidebar.folderSourceControl.prTitle',
              'Create pull request'
            )}
            title={translate(
              'auto.components.right.sidebar.folderSourceControl.prTitle',
              'Create pull request'
            )}
            onClick={() => setPrOpen(true)}
          >
            <GitPullRequest />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={busy}
          aria-label={translate('auto.components.right.sidebar.folderSourceControl.fetch', 'Fetch')}
          title={translate('auto.components.right.sidebar.folderSourceControl.fetch', 'Fetch')}
          onClick={() => void run({ kind: 'fetch' })}
        >
          <Download />
        </Button>
        {syncAction ? (
          <SyncButton action={syncAction} upstream={upstream} disabled={busy} onRun={request} />
        ) : null}
        <span className="mr-2 rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
          {entries.length}
        </span>
      </div>
      {collapsed ? null : (
        <>
          <div className="flex flex-col gap-1 px-3 py-1">
            <div
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void commit()
                }
              }}
            >
              <CommitMessageComposer
                rows={2}
                commitMessage={message}
                disabled={false}
                onCommitMessageChange={setMessage}
                describedBy=""
                showGenerate={ai.showGenerate}
                isGenerating={ai.isGenerating}
                onCancelGenerate={ai.cancel}
                isGenerateDisabled={ai.isGenerateDisabled}
                onGenerate={ai.generate}
                generateTooltip={ai.generateTooltip}
              />
            </div>
            <Button
              size="sm"
              disabled={busy || staged.length === 0 || message.trim().length === 0}
              onClick={() => void commit()}
            >
              <Check />
              {translate('auto.components.right.sidebar.folderSourceControl.commit', 'Commit')}
            </Button>
          </div>
          {entries.length === 0 ? (
            <div className="px-6 py-1 text-xs text-muted-foreground">
              {translate('auto.components.right.sidebar.folderSourceControl.clean', 'No changes')}
            </div>
          ) : null}
          {staged.length > 0 ? (
            <div>
              <div className="flex items-center px-6 py-0.5 text-[11px] uppercase text-muted-foreground">
                <span className="flex-1">
                  {translate(
                    'auto.components.right.sidebar.folderSourceControl.staged',
                    'Staged changes'
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={busy}
                  aria-label={translate(
                    'auto.components.right.sidebar.folderSourceControl.unstageAll',
                    'Unstage all'
                  )}
                  onClick={() => request({ kind: 'unstage', paths: staged.map((e) => e.path) })}
                >
                  <Minus />
                </Button>
              </div>
              {staged.map((entry) => (
                <FileRow
                  key={`staged:${entry.path}`}
                  entry={entry}
                  onOpen={(file) => onOpen(repo, file)}
                  onRun={request}
                />
              ))}
            </div>
          ) : null}
          {unstaged.length > 0 ? (
            <div>
              <div className="flex items-center px-6 py-0.5 text-[11px] uppercase text-muted-foreground">
                <span className="flex-1">
                  {translate(
                    'auto.components.right.sidebar.folderSourceControl.changes',
                    'Changes'
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={busy}
                  aria-label={translate(
                    'auto.components.right.sidebar.folderSourceControl.stageAll',
                    'Stage all'
                  )}
                  onClick={() => request({ kind: 'stage', paths: unstaged.map((e) => e.path) })}
                >
                  <Plus />
                </Button>
              </div>
              {unstaged.map((entry) => (
                <FileRow
                  key={`${entry.area}:${entry.path}`}
                  entry={entry}
                  onOpen={(file) => onOpen(repo, file)}
                  onRun={request}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
      {branch ? (
        <FolderProjectPullRequestDialog
          open={prOpen}
          onOpenChange={setPrOpen}
          repoPath={repo.path}
          repoName={repo.name}
          branch={branch}
          upstream={upstream}
          hasUncommittedChanges={entries.length > 0}
          onCreated={() => void onChanged()}
        />
      ) : null}
      <Dialog
        open={pendingDiscard !== null}
        onOpenChange={(open) => !open && setPendingDiscard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate(
                'auto.components.right.sidebar.folderSourceControl.discardTitle',
                'Discard changes?'
              )}
            </DialogTitle>
            <DialogDescription>
              {(pendingDiscard ?? []).length === 1
                ? pendingDiscard?.[0]
                : `${(pendingDiscard ?? []).length} files`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDiscard(null)}>
              {translate('auto.components.right.sidebar.folderSourceControl.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const paths = pendingDiscard ?? []
                setPendingDiscard(null)
                void run({ kind: 'discard', paths })
              }}
            >
              {translate('auto.components.right.sidebar.folderSourceControl.discard', 'Discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
