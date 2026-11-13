import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import type { HostedReviewCreationEligibility } from '../../../../shared/source-control/hosted-review/hosted-review-contracts'
import { normalizeHostedReviewBaseRef } from '../../../../shared/source-control/hosted-review/hosted-review-refs'
import type { GitUpstreamStatus } from '../../../../shared/git/status/git-status-types'
import { resolveBlockedCreateReviewNoticeMessage } from './source-control/review/source-control-create-review-blocked-action'
import { localizedCreateFailure } from './hosted-review/provider-actions/hosted-review-create-failure-copy'
import {
  createFolderProjectPullRequest,
  readFolderProjectPullRequestEligibility
} from './folder-project-pull-request'

type Loaded = { eligibility: HostedReviewCreationEligibility; bases: string[] }

async function loadPullRequestForm(
  repoPath: string,
  branch: string,
  upstream: GitUpstreamStatus | undefined,
  dirty: boolean
): Promise<Loaded> {
  const [eligibility, local] = await Promise.all([
    readFolderProjectPullRequestEligibility(repoPath, branch, upstream, dirty),
    window.api.git.localBranches({ worktreePath: repoPath })
  ])
  const preferred = eligibility.defaultBaseRef
    ? normalizeHostedReviewBaseRef(eligibility.defaultBaseRef)
    : null
  const bases = [
    ...new Set([preferred, ...local.branches].filter((name): name is string => !!name))
  ]
  return { eligibility, bases: bases.filter((name) => name !== branch) }
}

export function FolderProjectPullRequestDialog({
  open,
  onOpenChange,
  repoPath,
  repoName,
  branch,
  upstream,
  hasUncommittedChanges,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  repoPath: string
  repoName: string
  branch: string
  upstream: GitUpstreamStatus | undefined
  hasUncommittedChanges: boolean
  onCreated: () => void
}): React.JSX.Element {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [base, setBase] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let stale = false
    setLoaded(null)
    setLoadError(null)
    loadPullRequestForm(repoPath, branch, upstream, hasUncommittedChanges)
      .then((result) => {
        if (stale) {
          return
        }
        setLoaded(result)
        setBase(result.bases[0] ?? '')
        setTitle(result.eligibility.title ?? '')
        setBody(result.eligibility.body ?? '')
      })
      .catch((error: unknown) => {
        if (!stale) {
          setLoadError(error instanceof Error ? error.message : String(error))
        }
      })
    return () => {
      stale = true
    }
    // Reload only when the dialog opens for another repo or branch, not on every status poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repoPath, branch])

  const eligibility = loaded?.eligibility ?? null
  const existing = eligibility?.review ?? null
  const blocked = resolveBlockedCreateReviewNoticeMessage(eligibility)
  const needsPush =
    eligibility?.blockedReason === 'needs_push' || eligibility?.blockedReason === 'no_upstream'
  const canSubmit =
    !!eligibility &&
    !creating &&
    !existing &&
    title.trim().length > 0 &&
    base.length > 0 &&
    (eligibility.canCreate || (needsPush && !hasUncommittedChanges))

  const create = async (): Promise<void> => {
    if (!eligibility) {
      return
    }
    setCreating(true)
    try {
      const result = await createFolderProjectPullRequest({
        repoPath,
        branch,
        base,
        title: title.trim(),
        body,
        eligibility,
        upstream
      })
      if (result.ok) {
        toast.success(
          translate(
            'auto.components.right.sidebar.folderSourceControl.prCreated',
            'Pull request created'
          ),
          {
            action: {
              label: translate('auto.components.right.sidebar.folderSourceControl.prOpen', 'Open'),
              onClick: () => openAppHttpLink(result.url)
            }
          }
        )
        onOpenChange(false)
      } else {
        toast.error(localizedCreateFailure(result, eligibility.provider))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setCreating(false)
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {translate(
              'auto.components.right.sidebar.folderSourceControl.prTitle',
              'Create pull request'
            )}
          </DialogTitle>
          <DialogDescription>{`${repoName} · ${branch}`}</DialogDescription>
        </DialogHeader>
        {loadError ? (
          <p className="text-xs text-destructive">{loadError}</p>
        ) : !loaded ? (
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.right.sidebar.folderSourceControl.prLoading',
              'Checking branch…'
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-3 text-xs">
            {existing ? (
              <p>
                <Button variant="link" size="xs" onClick={() => openAppHttpLink(existing.url)}>
                  {translate(
                    'auto.components.right.sidebar.folderSourceControl.prExisting',
                    'This branch already has a pull request. Open it'
                  )}
                </Button>
              </p>
            ) : blocked ? (
              <p className="text-muted-foreground">{blocked}</p>
            ) : null}
            <label className="flex flex-col gap-1">
              {translate('auto.components.right.sidebar.folderSourceControl.prBase', 'Merge into')}
              <Select value={base} onValueChange={setBase}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loaded.bases.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              {translate('auto.components.right.sidebar.folderSourceControl.prName', 'Title')}
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              {translate('auto.components.right.sidebar.folderSourceControl.prBody', 'Description')}
              <Textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('auto.components.right.sidebar.folderSourceControl.cancel', 'Cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={() => void create()}>
            {needsPush
              ? translate(
                  'auto.components.right.sidebar.folderSourceControl.prPushCreate',
                  'Push and create'
                )
              : translate('auto.components.right.sidebar.folderSourceControl.prCreate', 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
