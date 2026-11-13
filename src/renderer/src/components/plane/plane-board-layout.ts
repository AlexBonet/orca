import {
  PLANE_PRIORITIES,
  isPlanePriority,
  type PlaneBoard,
  type PlaneCycle,
  type PlaneIssueSummary,
  type PlaneIssueUpdate,
  type PlaneState
} from '../../../../shared/plane/plane-types'

export const PLANE_BOARD_GROUPS = ['cycle', 'priority', 'none'] as const
export type PlaneBoardGroupBy = (typeof PLANE_BOARD_GROUPS)[number]

export function isPlaneBoardGroupBy(value: unknown): value is PlaneBoardGroupBy {
  return PLANE_BOARD_GROUPS.some((group) => group === value)
}

export const NO_CYCLE_LANE = '__no-cycle__'
export const ALL_ISSUES_LANE = '__all__'

export type PlaneBoardLane = {
  id: string
  /** Cycle name, priority key or null for the catch-all lanes the view labels itself. */
  label: string | null
  count: number
  cells: Record<string, PlaneIssueSummary[]>
}

export type PlaneBoardLayout = {
  columns: PlaneState[]
  lanes: PlaneBoardLane[]
}

export type PlaneBoardLayoutOptions = {
  groupBy: PlaneBoardGroupBy
  query: string
  assigneeId: string | null
}

function compareCycles(a: PlaneCycle, b: PlaneCycle): number {
  if (a.startDate && b.startDate) {
    return b.startDate.localeCompare(a.startDate)
  }
  if (a.startDate || b.startDate) {
    return a.startDate ? -1 : 1
  }
  return a.name.localeCompare(b.name)
}

function matches(issue: PlaneIssueSummary, options: PlaneBoardLayoutOptions): boolean {
  if (options.assigneeId && !issue.assigneeIds.includes(options.assigneeId)) {
    return false
  }
  const query = options.query.trim().toLowerCase()
  return !query || `${issue.key} ${issue.title}`.toLowerCase().includes(query)
}

function laneIdFor(
  issue: PlaneIssueSummary,
  groupBy: PlaneBoardGroupBy,
  cycleByIssueId: Record<string, string>
): string {
  if (groupBy === 'cycle') {
    return cycleByIssueId[issue.id] ?? NO_CYCLE_LANE
  }
  return groupBy === 'priority' ? issue.priority : ALL_ISSUES_LANE
}

function emptyLane(id: string, label: string | null, columns: PlaneState[]): PlaneBoardLane {
  return {
    id,
    label,
    count: 0,
    cells: Object.fromEntries(columns.map((column) => [column.id, []]))
  }
}

function laneDefinitions(
  board: PlaneBoard,
  groupBy: PlaneBoardGroupBy,
  columns: PlaneState[]
): PlaneBoardLane[] {
  if (groupBy === 'cycle') {
    return [
      ...[...board.cycles]
        .sort(compareCycles)
        .map((cycle) => emptyLane(cycle.id, cycle.name, columns)),
      emptyLane(NO_CYCLE_LANE, null, columns)
    ]
  }
  if (groupBy === 'priority') {
    return PLANE_PRIORITIES.map((priority) => emptyLane(priority, priority, columns))
  }
  return [emptyLane(ALL_ISSUES_LANE, null, columns)]
}

export function buildPlaneBoardLayout(
  board: PlaneBoard,
  options: PlaneBoardLayoutOptions
): PlaneBoardLayout {
  const columns = board.states
  const lanes = laneDefinitions(board, options.groupBy, columns)
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]))
  for (const issue of board.issues) {
    if (!matches(issue, options)) {
      continue
    }
    const lane =
      laneById.get(laneIdFor(issue, options.groupBy, board.cycleByIssueId)) ??
      // A cycle that is archived or unreadable must not hide its work items.
      laneById.get(options.groupBy === 'cycle' ? NO_CYCLE_LANE : ALL_ISSUES_LANE)
    const cell = lane?.cells[issue.stateId]
    if (lane && cell) {
      cell.push(issue)
      lane.count++
    }
  }
  return { columns, lanes }
}

/** The update a drop on `laneId` / `stateId` implies; empty when nothing changes. */
export function planeBoardDropUpdate(
  issue: PlaneIssueSummary,
  target: { laneId: string; stateId: string },
  context: { groupBy: PlaneBoardGroupBy; currentLaneId: string }
): PlaneIssueUpdate {
  const update: PlaneIssueUpdate = {}
  if (target.stateId !== issue.stateId) {
    update.stateId = target.stateId
  }
  if (target.laneId !== context.currentLaneId) {
    if (context.groupBy === 'cycle') {
      update.cycleId = target.laneId === NO_CYCLE_LANE ? null : target.laneId
    } else if (context.groupBy === 'priority' && isPlanePriority(target.laneId)) {
      update.priority = target.laneId
    }
  }
  return update
}

export function applyPlaneBoardUpdate(
  board: PlaneBoard,
  issueId: string,
  update: PlaneIssueUpdate
): PlaneBoard {
  const nextState = update.stateId
    ? board.states.find((state) => state.id === update.stateId)
    : null
  const cycleByIssueId = { ...board.cycleByIssueId }
  if (update.cycleId !== undefined) {
    if (update.cycleId) {
      cycleByIssueId[issueId] = update.cycleId
    } else {
      delete cycleByIssueId[issueId]
    }
  }
  return {
    ...board,
    cycleByIssueId,
    issues: board.issues.map((issue) =>
      issue.id === issueId
        ? {
            ...issue,
            ...(update.priority ? { priority: update.priority } : {}),
            ...(nextState
              ? { stateId: nextState.id, stateName: nextState.name, stateGroup: nextState.group }
              : {})
          }
        : issue
    )
  }
}

export function isPlaneBoardClosedColumn(state: PlaneState): boolean {
  return state.group === 'completed' || state.group === 'cancelled'
}
