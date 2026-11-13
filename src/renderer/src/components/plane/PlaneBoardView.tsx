import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { ChevronDown, ChevronRight, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type {
  PlaneBoard,
  PlaneIssueSummary,
  PlaneState
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
import { Toggle } from '@/components/ui/toggle'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/class-names'
import { useAppStore } from '@/store'
import { PlaneBoardCardBody } from './PlaneBoardCard'
import {
  BoardCell,
  COLLAPSED_COLUMN_WIDTH_CLASS,
  COLUMN_WIDTH_CLASS,
  cellKey
} from './PlaneBoardCell'
import {
  NO_CYCLE_LANE,
  applyPlaneBoardUpdate,
  buildPlaneBoardLayout,
  isPlaneBoardClosedColumn,
  isPlaneBoardGroupBy,
  planeBoardDropUpdate,
  type PlaneBoardGroupBy,
  type PlaneBoardLane
} from './plane-board-layout'
import { readStoredPlaneBoardGroup, storePlaneBoardGroup } from './plane-view-storage'
import { PlaneStateMessage, useStartPlaneWorkspace } from './plane-task-chrome'
import { planeApi } from './plane-api'

const CELL_PAGE_SIZE = 20

function laneTitle(lane: PlaneBoardLane): string {
  if (lane.id === NO_CYCLE_LANE) {
    return translate('plane.board.noCycle', 'No cycle')
  }
  return lane.label ?? translate('plane.board.allWorkItems', 'All work items')
}

export function PlaneBoardView({
  projectId,
  onOpen
}: {
  projectId: string
  onOpen: (key: string) => void
}): React.JSX.Element {
  const viewerId = useAppStore((s) => s.planeStatus.viewer?.id ?? null)
  const startWorkspace = useStartPlaneWorkspace()
  const [board, setBoard] = useState<PlaneBoard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<PlaneBoardGroupBy>(readStoredPlaneBoardGroup)
  const [query, setQuery] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [columnOverrides, setColumnOverrides] = useState<Record<string, boolean>>({})
  const [laneOverrides, setLaneOverrides] = useState<Record<string, boolean>>({})
  const [cellLimits, setCellLimits] = useState<Record<string, number>>({})
  const [dragged, setDragged] = useState<PlaneIssueSummary | null>(null)
  const requestRef = useRef(0)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await planeApi().getBoard({ projectId })
      if (requestId !== requestRef.current) {
        return
      }
      if (result.ok) {
        setBoard(result.board)
      } else {
        setBoard(null)
        setError(result.error)
      }
    } catch {
      if (requestId === requestRef.current) {
        setError(translate('plane.tasks.loadFailed', 'Unable to load Plane work items.'))
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const layout = useMemo(
    () =>
      board
        ? buildPlaneBoardLayout(board, {
            groupBy,
            query,
            assigneeId: mineOnly ? viewerId : null
          })
        : null,
    [board, groupBy, query, mineOnly, viewerId]
  )

  const isColumnCollapsed = (state: PlaneState): boolean =>
    columnOverrides[state.id] ?? isPlaneBoardClosedColumn(state)

  const isLaneExpanded = (lane: PlaneBoardLane, columns: PlaneState[]): boolean =>
    laneOverrides[lane.id] ??
    columns.some((column) => !isPlaneBoardClosedColumn(column) && lane.cells[column.id].length > 0)

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    setDragged(null)
    if (!board || !event.over) {
      return
    }
    const issue = board.issues.find((entry) => entry.id === event.active.id)
    const [laneId, stateId] = String(event.over.id).split('::')
    if (!issue || !laneId || !stateId) {
      return
    }
    const currentLaneId =
      groupBy === 'cycle'
        ? (board.cycleByIssueId[issue.id] ?? NO_CYCLE_LANE)
        : groupBy === 'priority'
          ? issue.priority
          : laneId
    const update = planeBoardDropUpdate(issue, { laneId, stateId }, { groupBy, currentLaneId })
    if (Object.keys(update).length === 0) {
      return
    }
    const previous = board
    setBoard(applyPlaneBoardUpdate(board, issue.id, update))
    try {
      const result = await planeApi().updateIssue({ key: issue.key, updates: update })
      if (!result.ok) {
        setBoard(previous)
        toast.error(result.error)
      }
    } catch {
      setBoard(previous)
      toast.error(translate('plane.tasks.updateFailed', 'Could not update the work item.'))
    }
  }

  const handleDragStart = (event: DragStartEvent): void => {
    setDragged(board?.issues.find((issue) => issue.id === event.active.id) ?? null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate('plane.board.search', 'Search work items')}
          aria-label={translate('plane.board.search', 'Search work items')}
          className="h-8 w-48"
        />
        <Toggle
          variant="outline"
          size="sm"
          pressed={mineOnly}
          disabled={!viewerId}
          onPressedChange={setMineOnly}
        >
          {translate('plane.board.mine', 'Assigned to me')}
        </Toggle>
        <Select
          value={groupBy}
          onValueChange={(value) => {
            if (isPlaneBoardGroupBy(value)) {
              setGroupBy(value)
              storePlaneBoardGroup(value)
            }
          }}
        >
          <SelectTrigger size="sm" aria-label={translate('plane.board.groupBy', 'Group by')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cycle">{translate('plane.board.groupCycle', 'Cycle')}</SelectItem>
            <SelectItem value="priority">
              {translate('plane.board.groupPriority', 'Priority')}
            </SelectItem>
            <SelectItem value="none">
              {translate('plane.board.groupNone', 'No grouping')}
            </SelectItem>
          </SelectContent>
        </Select>
        {board?.truncated ? (
          <span className="text-2xs text-muted-foreground">
            {translate('plane.board.truncated', 'Showing the most recent work items only.')}
          </span>
        ) : null}
        {loading && board ? <LoaderCircle className="ml-auto size-4 animate-spin" /> : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={loading && board ? undefined : 'ml-auto'}
          disabled={loading}
          onClick={() => void load()}
        >
          {translate('plane.tasks.refresh', 'Refresh')}
        </Button>
      </div>
      {error ? (
        <PlaneStateMessage>{error}</PlaneStateMessage>
      ) : !layout ? (
        <PlaneStateMessage>
          <LoaderCircle className="mx-auto size-4 animate-spin" />
        </PlaneStateMessage>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={(event) => void handleDragEnd(event)}
          onDragCancel={() => setDragged(null)}
        >
          <div className="min-h-0 flex-1 overflow-auto scrollbar-sleek">
            <div className="flex w-max min-w-full flex-col">
              <div className="sticky top-0 z-10 flex gap-0 border-b border-border/50 bg-muted px-1.5">
                {layout.columns.map((state) => {
                  const collapsed = isColumnCollapsed(state)
                  const total = layout.lanes.reduce(
                    (sum, lane) => sum + lane.cells[state.id].length,
                    0
                  )
                  return (
                    <button
                      key={state.id}
                      type="button"
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 p-1.5 text-left text-sm font-medium hover:bg-accent',
                        collapsed ? COLLAPSED_COLUMN_WIDTH_CLASS : COLUMN_WIDTH_CLASS
                      )}
                      aria-expanded={!collapsed}
                      onClick={() =>
                        setColumnOverrides((current) => ({ ...current, [state.id]: !collapsed }))
                      }
                    >
                      {collapsed ? null : <span className="truncate">{state.name}</span>}
                      <span className="text-2xs font-normal text-muted-foreground">{total}</span>
                    </button>
                  )
                })}
              </div>
              {layout.lanes.map((lane) => {
                const expanded = isLaneExpanded(lane, layout.columns)
                const showHeader = groupBy !== 'none'
                return (
                  <div key={lane.id} className="border-b border-border/50">
                    {showHeader ? (
                      <button
                        type="button"
                        className="sticky left-0 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                        aria-expanded={expanded}
                        onClick={() =>
                          setLaneOverrides((current) => ({ ...current, [lane.id]: !expanded }))
                        }
                      >
                        {expanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <span className="capitalize">{laneTitle(lane)}</span>
                        <span className="text-2xs text-muted-foreground">{lane.count}</span>
                      </button>
                    ) : null}
                    {expanded || !showHeader ? (
                      <div className="flex gap-0 px-1.5 pb-2">
                        {layout.columns.map((state) => {
                          const key = cellKey(lane.id, state.id)
                          return (
                            <BoardCell
                              key={state.id}
                              laneId={lane.id}
                              state={state}
                              issues={lane.cells[state.id]}
                              collapsed={isColumnCollapsed(state)}
                              limit={cellLimits[key] ?? CELL_PAGE_SIZE}
                              onShowMore={() =>
                                setCellLimits((current) => ({
                                  ...current,
                                  [key]: (current[key] ?? CELL_PAGE_SIZE) + CELL_PAGE_SIZE
                                }))
                              }
                              onOpen={onOpen}
                              onStartWorkspace={startWorkspace}
                            />
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
          <DragOverlay>
            {dragged ? (
              <div
                className={cn(
                  COLUMN_WIDTH_CLASS,
                  'rounded-md border border-border bg-card p-2.5 shadow-floating'
                )}
              >
                <PlaneBoardCardBody issue={dragged} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
