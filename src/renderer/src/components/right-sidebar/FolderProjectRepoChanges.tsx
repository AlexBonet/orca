import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  CloudUpload,
  Download,
  Minus,
  Plus,
  RefreshCw,
  Undo2
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import type {
  GitFileStatus,
  GitStatusEntry,
  GitUpstreamStatus
} from '../../../../shared/git/status/git-status-types'
import type { FolderProjectSubRepo } from './folder-project-sub-repos'
import {
  getFolderProjectBranchLabel,
  runFolderProjectRepoOperation,
  type FolderProjectRepoOperation,
  type FolderProjectRepoSnapshot
} from './folder-project-repo-git'
import {
  getFolderProjectRepoSyncAction,
  type FolderProjectRepoSyncAction
} from './folder-project-repo-sync-state'

const EMPTY_ENTRIES: GitStatusEntry[] = []

const STATUS_LETTER: Record<GitFileStatus, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  copied: 'C'
}

function splitPath(path: string): { name: string; dir: string } {
  const index = path.lastIndexOf('/')
  return index === -1
    ? { name: path, dir: '' }
    : { name: path.slice(index + 1), dir: path.slice(0, index) }
}

type RepoRunner = (operation: FolderProjectRepoOperation) => Promise<boolean>

function FileRow({
  entry,
  onOpen,
  onRun
}: {
  entry: GitStatusEntry
  onOpen: (entry: GitStatusEntry) => void
  onRun: (operation: FolderProjectRepoOperation) => void
}): React.JSX.Element {
  const { name, dir } = splitPath(entry.path)
  const staged = entry.area === 'staged'
  return (
    <div
      className="group flex items-center gap-1 px-3 py-0.5 text-xs hover:bg-accent/50"
      title={entry.path}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => onOpen(entry)}
      >
        <span className="min-w-0 truncate">{name}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{dir}</span>
      </button>
      <span className="hidden shrink-0 items-center group-hover:flex">
        {staged ? null : (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={translate(
              'auto.components.right.sidebar.folderSourceControl.discard',
              'Discard'
            )}
            onClick={() => onRun({ kind: 'discard', paths: [entry.path] })}
          >
            <Undo2 />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={
            staged
              ? translate('auto.components.right.sidebar.folderSourceControl.unstage', 'Unstage')
              : translate('auto.components.right.sidebar.folderSourceControl.stage', 'Stage')
          }
          onClick={() => onRun({ kind: staged ? 'unstage' : 'stage', paths: [entry.path] })}
        >
          {staged ? <Minus /> : <Plus />}
        </Button>
      </span>
      <span className="w-3 shrink-0 text-center font-mono text-muted-foreground">
        {STATUS_LETTER[entry.status]}
      </span>
    </div>
  )
}

function SyncButton({
  action,
  upstream,
  disabled,
  onRun
}: {
  action: Exclude<FolderProjectRepoSyncAction, null>
  upstream: GitUpstreamStatus | undefined
  disabled: boolean
  onRun: (operation: FolderProjectRepoOperation) => void
}): React.JSX.Element {
  const label =
    action === 'publish'
      ? translate('auto.components.right.sidebar.folderSourceControl.publish', 'Publish branch')
      : action === 'pull'
        ? translate('auto.components.right.sidebar.folderSourceControl.pull', 'Pull')
        : action === 'push'
          ? translate('auto.components.right.sidebar.folderSourceControl.push', 'Push')
          : translate('auto.components.right.sidebar.folderSourceControl.sync', 'Sync changes')
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={() => onRun({ kind: 'sync', action })}
    >
      {action === 'publish' ? <CloudUpload /> : <RefreshCw />}
      {upstream?.hasUpstream ? (
        <span className="tabular-nums">{`${upstream.behind}↓ ${upstream.ahead}↑`}</span>
      ) : null}
    </Button>
  )
}

export function RepoChanges({
  repo,
  snapshot,
  onChanged,
  onOpen
}: {
  repo: FolderProjectSubRepo
  snapshot: FolderProjectRepoSnapshot | undefined
  onChanged: () => Promise<void>
  onOpen: (repo: FolderProjectSubRepo, entry: GitStatusEntry) => void
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
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
          {branch ? <span className="truncate text-muted-foreground">{branch}</span> : null}
        </button>
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
            <Textarea
              rows={2}
              value={message}
              placeholder={translate(
                'auto.components.right.sidebar.folderSourceControl.commitPlaceholder',
                'Message'
              )}
              className="min-h-0 resize-none text-xs"
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void commit()
                }
              }}
            />
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
