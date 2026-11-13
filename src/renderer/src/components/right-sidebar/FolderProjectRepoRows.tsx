import { Minus, Plus, Undo2, CloudUpload, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type {
  GitFileStatus,
  GitStatusEntry,
  GitUpstreamStatus
} from '../../../../shared/git/status/git-status-types'
import type { FolderProjectRepoOperation } from './folder-project-repo-git'
import type { FolderProjectRepoSyncAction } from './folder-project-repo-sync-state'

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

export function FileRow({
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

export function SyncButton({
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
