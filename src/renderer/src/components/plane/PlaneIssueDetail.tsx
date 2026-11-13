import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Clipboard, ExternalLink, GitBranch, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type {
  PlaneComment,
  PlaneIssue,
  PlaneIssueExtras
} from '../../../../shared/plane/plane-types'
import { Button } from '@/components/ui/button'
import { getIntlLocale, translate } from '@/i18n/i18n'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { PlaneCommentComposer } from './PlaneCommentComposer'
import { PlaneCreateIssueDialog } from './PlaneCreateIssueDialog'
import { PlaneIssueControls } from './PlaneIssueControls'
import { PlaneIssueProperties } from './PlaneIssueProperties'
import { PlaneIssueRelations } from './PlaneIssueRelations'
import { planeHtmlToText } from './plane-html-text'
import { PlaneRichText } from './plane-rich-text'
import { PLANE_CARD_CLASS, PlaneStateMessage, useStartPlaneWorkspace } from './plane-task-chrome'
import { planeApi } from './plane-api'

export function PlaneIssueDetail({
  issueKey,
  onBack,
  onOpenIssue
}: {
  issueKey: string
  onBack: () => void
  onOpenIssue: (key: string) => void
}): React.JSX.Element {
  const startWorkspace = useStartPlaneWorkspace()
  const [issue, setIssue] = useState<PlaneIssue | null>(null)
  const [comments, setComments] = useState<PlaneComment[]>([])
  const [extras, setExtras] = useState<PlaneIssueExtras | null>(null)
  const [subIssueOpen, setSubIssueOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const reload = useCallback(() => setReloadNonce((nonce) => nonce + 1), [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [issueResult, commentsResult, extrasResult] = await Promise.all([
        planeApi().getIssue({ key: issueKey }),
        planeApi().issueComments({ key: issueKey }),
        planeApi().issueExtras({ key: issueKey })
      ])
      if (cancelled) {
        return
      }
      if (!issueResult.ok) {
        setError(issueResult.error)
        return
      }
      setIssue(issueResult.issue)
      setExtras(extrasResult.ok ? extrasResult.extras : null)
      setComments(commentsResult.ok ? commentsResult.comments : [])
    })().catch(() => {
      if (!cancelled) {
        setError(translate('plane.tasks.loadFailed', 'Unable to load Plane work items.'))
      }
    })
    return () => {
      cancelled = true
    }
  }, [issueKey, reloadNonce])

  const copyKey = (): void => {
    void window.api.ui
      .writeClipboardText(issueKey)
      .then(() => toast.success(translate('plane.tasks.keyCopied', 'Key copied')))
      .catch(() => toast.error(translate('plane.tasks.copyFailed', 'Could not copy')))
  }

  return (
    <div className={PLANE_CARD_CLASS}>
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {translate('plane.tasks.back', 'Plane list')}
        </Button>
        <span className="font-mono text-xs text-muted-foreground">{issueKey}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={copyKey}>
            <Clipboard className="size-4" />
            {translate('plane.tasks.copyKey', 'Copy key')}
          </Button>
          {issue ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openAppHttpLink(issue.url)}
              >
                <ExternalLink className="size-4" />
                {translate('plane.tasks.open', 'Open in Plane')}
              </Button>
              <Button type="button" size="sm" onClick={() => startWorkspace(issue)}>
                <GitBranch className="size-4" />
                {translate('plane.tasks.startWorkspace', 'Start workspace')}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek px-4 py-3">
        {error ? (
          <PlaneStateMessage>{error}</PlaneStateMessage>
        ) : !issue ? (
          <PlaneStateMessage>
            <LoaderCircle className="mx-auto size-4 animate-spin" />
          </PlaneStateMessage>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div>
                <h2 className="text-base font-semibold leading-snug">{issue.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{issue.projectName}</p>
              </div>
              {planeHtmlToText(issue.descriptionHtml) ? (
                <PlaneRichText html={issue.descriptionHtml} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {translate('plane.tasks.noDescription', 'No description.')}
                </p>
              )}
              {extras ? (
                <PlaneIssueRelations
                  issue={issue}
                  extras={extras}
                  onOpen={onOpenIssue}
                  onAddSubIssue={() => setSubIssueOpen(true)}
                  onChanged={reload}
                />
              ) : null}
              <div className="flex flex-col gap-3 border-t border-border/50 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {translate('plane.detail.comments', 'Comments')} ({comments.length})
                </h3>
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <p className="text-xs font-medium text-muted-foreground">
                      {comment.authorName}
                      {comment.createdAt
                        ? ` · ${new Date(comment.createdAt).toLocaleString(getIntlLocale())}`
                        : ''}
                    </p>
                    <div className="mt-1">
                      <PlaneRichText html={comment.bodyHtml} />
                    </div>
                  </div>
                ))}
                <PlaneCommentComposer issueKey={issue.key} onPosted={reload} />
              </div>
            </div>
            <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
              <PlaneIssueControls
                issue={issue}
                onChanged={reload}
                className="flex flex-col items-stretch gap-2"
              />
              <PlaneIssueProperties issue={issue} extras={extras} onChanged={reload} />
            </aside>
            <PlaneCreateIssueDialog
              open={subIssueOpen}
              onOpenChange={setSubIssueOpen}
              projects={[]}
              defaultProjectId={issue.projectId}
              parent={{ id: issue.id, projectId: issue.projectId, key: issue.key }}
              onCreated={() => {
                reload()
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
