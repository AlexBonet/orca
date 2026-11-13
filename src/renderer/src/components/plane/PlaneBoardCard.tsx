import { CalendarDays, GitBranch, ListTree } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import type { PlaneIssueSummary } from '../../../../shared/plane/plane-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getIntlLocale, translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'

const MAX_VISIBLE_LABELS = 3

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(getIntlLocale(), {
    month: 'short',
    day: 'numeric'
  })
}

export function PlaneLabelChip({
  label
}: {
  label: PlaneIssueSummary['labelItems'][number]
}): React.JSX.Element {
  return (
    <Badge variant="referenceLabel">
      <span
        className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
        style={label.color ? { backgroundColor: label.color } : undefined}
      />
      {label.name}
    </Badge>
  )
}

export function PlaneBoardCardBody({
  issue,
  onStartWorkspace
}: {
  issue: PlaneIssueSummary
  onStartWorkspace?: (issue: PlaneIssueSummary) => void
}): React.JSX.Element {
  const labels = issue.labelItems
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono text-2xs text-muted-foreground">{issue.key}</span>
        {onStartWorkspace ? (
          <span className="ml-auto opacity-0 focus-within:opacity-100 group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={translate('plane.tasks.startWorkspace', 'Start workspace')}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onStartWorkspace(issue)
              }}
            >
              <GitBranch className="size-3.5" />
            </Button>
          </span>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-3 text-sm leading-snug">{issue.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {issue.priority !== 'none' ? (
          <Badge variant="outline">
            {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
          </Badge>
        ) : null}
        {labels.slice(0, MAX_VISIBLE_LABELS).map((label) => (
          <PlaneLabelChip key={label.id} label={label} />
        ))}
        {labels.length > MAX_VISIBLE_LABELS ? (
          <span className="text-2xs text-muted-foreground">
            +{labels.length - MAX_VISIBLE_LABELS}
          </span>
        ) : null}
      </div>
      {issue.targetDate || issue.subIssueCount > 0 || issue.assigneeNames.length > 0 ? (
        <div className="mt-2 flex items-center gap-3 text-2xs text-muted-foreground">
          {issue.targetDate ? (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {formatDate(issue.targetDate)}
            </span>
          ) : null}
          {issue.subIssueCount > 0 ? (
            <span className="flex items-center gap-1">
              <ListTree className="size-3" />
              {issue.subIssueCount}
            </span>
          ) : null}
          {issue.assigneeNames.length > 0 ? (
            <span className="ml-auto max-w-28 truncate">{issue.assigneeNames.join(', ')}</span>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

export function PlaneBoardCard({
  issue,
  onOpen,
  onStartWorkspace
}: {
  issue: PlaneIssueSummary
  onOpen: (key: string) => void
  onStartWorkspace: (issue: PlaneIssueSummary) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: issue.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      className={cn(
        'group w-full cursor-grab rounded-md border border-border/50 bg-card p-2.5 text-left shadow-xs hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        isDragging && 'opacity-40'
      )}
      onClick={() => onOpen(issue.key)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpen(issue.key)
        }
      }}
    >
      <PlaneBoardCardBody issue={issue} onStartWorkspace={onStartWorkspace} />
    </div>
  )
}
