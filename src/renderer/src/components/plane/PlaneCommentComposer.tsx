import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { translate } from '@/i18n/i18n'
import { planeApi } from './plane-api'

export function PlaneCommentComposer({
  issueKey,
  onPosted
}: {
  issueKey: string
  onPosted: () => void
}): React.JSX.Element {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)

  const post = async (): Promise<void> => {
    if (!body.trim() || posting) {
      return
    }
    setPosting(true)
    try {
      const result = await planeApi().addComment({ key: issueKey, body })
      if (result.ok) {
        setBody('')
        onPosted()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error(translate('plane.tasks.commentFailed', 'Could not post the comment.'))
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
      <Textarea
        value={body}
        rows={3}
        disabled={posting}
        placeholder={translate('plane.tasks.commentPlaceholder', 'Add a comment…')}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button
        type="button"
        size="sm"
        className="self-end"
        disabled={!body.trim() || posting}
        onClick={() => void post()}
      >
        {posting ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {translate('plane.tasks.comment', 'Comment')}
      </Button>
    </div>
  )
}
