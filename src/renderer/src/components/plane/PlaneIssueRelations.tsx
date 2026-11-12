import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  PLANE_RELATION_TYPES,
  isPlaneRelationType,
  type PlaneIssue,
  type PlaneIssueExtras,
  type PlaneIssueSummary,
  type PlaneRelationType
} from '../../../../shared/plane/plane-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { planeApi } from './plane-api'

function relationLabel(type: PlaneRelationType): string {
  switch (type) {
    case 'blocking':
      return translate('plane.relation.blocking', 'Blocking')
    case 'blocked_by':
      return translate('plane.relation.blockedBy', 'Blocked by')
    case 'duplicate':
      return translate('plane.relation.duplicate', 'Duplicate of')
    case 'relates_to':
      return translate('plane.relation.relatesTo', 'Related to')
  }
}

function IssueRow({
  issue,
  onOpen,
  onRemove
}: {
  issue: PlaneIssueSummary
  onOpen: (key: string) => void
  onRemove?: () => void
}): React.JSX.Element {
  return (
    <li className="group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => onOpen(issue.key)}
      >
        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{issue.key}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{issue.stateName}</span>
      </button>
      {onRemove ? (
        <span className="opacity-0 focus-within:opacity-100 group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={translate('plane.relation.remove', 'Remove relation')}
            onClick={onRemove}
          >
            <X className="size-3.5" />
          </Button>
        </span>
      ) : null}
    </li>
  )
}

export function PlaneIssueRelations({
  issue,
  extras,
  onOpen,
  onAddSubIssue,
  onChanged
}: {
  issue: PlaneIssue
  extras: PlaneIssueExtras
  onOpen: (key: string) => void
  onAddSubIssue: () => void
  onChanged: () => void
}): React.JSX.Element {
  const [type, setType] = useState<PlaneRelationType>('relates_to')
  const [relatedKey, setRelatedKey] = useState('')
  const [saving, setSaving] = useState(false)

  const setRelation = async (
    related: string,
    relationType: PlaneRelationType,
    remove: boolean
  ): Promise<void> => {
    setSaving(true)
    try {
      const result = await planeApi().setRelation({
        key: issue.key,
        relatedKey: related,
        type: relationType,
        remove
      })
      if (result.ok) {
        if (!remove) {
          setRelatedKey('')
        }
        onChanged()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error(translate('plane.relation.failed', 'Could not update the relation.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {translate('plane.detail.subIssues', 'Sub-work items')} ({extras.subIssues.length})
          </h3>
          <Button type="button" variant="ghost" size="icon-xs" onClick={onAddSubIssue}>
            <Plus className="size-3.5" />
            <span className="sr-only">
              {translate('plane.detail.addSubIssue', 'Add sub-work item')}
            </span>
          </Button>
        </div>
        <ul>
          {extras.subIssues.map((sub) => (
            <IssueRow key={sub.id} issue={sub} onOpen={onOpen} />
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {translate('plane.detail.relations', 'Relations')}
        </h3>
        {extras.relations.map((group) => (
          <div key={group.type}>
            <p className="px-2 pt-1 text-xs text-muted-foreground">{relationLabel(group.type)}</p>
            <ul>
              {group.issues.map((related) => (
                <IssueRow
                  key={related.id}
                  issue={related}
                  onOpen={onOpen}
                  onRemove={() => void setRelation(related.key, group.type, true)}
                />
              ))}
            </ul>
          </div>
        ))}
        {extras.unresolvedRelationCount > 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            {`${extras.unresolvedRelationCount} ${translate('plane.relation.otherProjects', 'in other projects')}`}
          </p>
        ) : null}
        <form
          className="mt-1 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (relatedKey.trim()) {
              void setRelation(relatedKey.trim(), type, false)
            }
          }}
        >
          <Select
            value={type}
            disabled={saving}
            onValueChange={(value) => isPlaneRelationType(value) && setType(value)}
          >
            <SelectTrigger size="sm" aria-label={translate('plane.relation.type', 'Relation type')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANE_RELATION_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {relationLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 w-40"
            value={relatedKey}
            disabled={saving}
            placeholder={translate('plane.relation.keyPlaceholder', 'PROJ-142')}
            aria-label={translate('plane.relation.keyLabel', 'Work item key')}
            onChange={(event) => setRelatedKey(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={saving || !relatedKey.trim()}>
            {translate('plane.relation.add', 'Add')}
          </Button>
        </form>
      </section>
    </div>
  )
}
