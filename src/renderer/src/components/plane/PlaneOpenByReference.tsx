import { useState } from 'react'
import { toast } from 'sonner'
import {
  normalizePlaneIssueKey,
  parsePlaneIssueUrl
} from '../../../../shared/plane/plane-issue-url'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'

export function PlaneOpenByReference({
  workspaceSlug,
  onOpen,
  className
}: {
  workspaceSlug: string | null
  onOpen: (key: string) => void
  className?: string
}): React.JSX.Element {
  const [value, setValue] = useState('')

  const submit = (): void => {
    const text = value.trim()
    if (!text) {
      return
    }
    const fromUrl = parsePlaneIssueUrl(text)
    if (fromUrl && fromUrl.workspaceSlug !== workspaceSlug) {
      toast.error(
        translate(
          'plane.tasks.otherWorkspace',
          'That work item belongs to another Plane workspace ({{slug}}).',
          { slug: fromUrl.workspaceSlug }
        )
      )
      return
    }
    const key = fromUrl?.issueKey ?? normalizePlaneIssueKey(text)
    if (!key) {
      toast.error(
        translate(
          'plane.tasks.invalidReference',
          'Enter a work item key like PROJ-142 or a Plane URL.'
        )
      )
      return
    }
    setValue('')
    onOpen(key)
  }

  return (
    <Input
      className={className ? `h-8 w-56 ${className}` : 'h-8 w-56'}
      value={value}
      spellCheck={false}
      placeholder={translate('plane.tasks.openByReference', 'Open by key or URL…')}
      aria-label={translate('plane.tasks.openByReference', 'Open by key or URL…')}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          submit()
        }
      }}
    />
  )
}
