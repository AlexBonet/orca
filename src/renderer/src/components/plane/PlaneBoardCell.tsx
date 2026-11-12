import { useDroppable } from '@dnd-kit/core'
import type { PlaneIssueSummary, PlaneState } from '../../../../shared/plane/plane-types'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'
import { PlaneBoardCard } from './PlaneBoardCard'

export const COLUMN_WIDTH_CLASS = 'w-72'
export const COLLAPSED_COLUMN_WIDTH_CLASS = 'w-12'

export function cellKey(laneId: string, stateId: string): string {
  return `${laneId}::${stateId}`
}

export function BoardCell({
  laneId,
  state,
  issues,
  collapsed,
  limit,
  onShowMore,
  onOpen,
  onStartWorkspace
}: {
  laneId: string
  state: PlaneState
  issues: PlaneIssueSummary[]
  collapsed: boolean
  limit: number
  onShowMore: () => void
  onOpen: (key: string) => void
  onStartWorkspace: (issue: PlaneIssueSummary) => void
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: cellKey(laneId, state.id) })
  const visible = issues.slice(0, limit)
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex shrink-0 flex-col gap-2 rounded-md p-1.5',
        collapsed ? COLLAPSED_COLUMN_WIDTH_CLASS : COLUMN_WIDTH_CLASS,
        isOver && 'bg-accent'
      )}
    >
      {collapsed ? (
        <span className="text-center text-2xs text-muted-foreground">{issues.length}</span>
      ) : (
        <>
          {visible.map((issue) => (
            <PlaneBoardCard
              key={issue.id}
              issue={issue}
              onOpen={onOpen}
              onStartWorkspace={onStartWorkspace}
            />
          ))}
          {issues.length > visible.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={onShowMore}>
              {translate('plane.board.showMore', 'Show more')} ({issues.length - visible.length})
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
