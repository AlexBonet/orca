import { isPlaneBoardGroupBy, type PlaneBoardGroupBy } from './plane-board-layout'

const VIEW_KEY = 'orca.plane.tasksView'
const GROUP_KEY = 'orca.plane.boardGroup'

export type PlaneTasksView = 'list' | 'board'

export function readStoredPlaneTasksView(): PlaneTasksView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list'
  } catch {
    return 'list'
  }
}

export function storePlaneTasksView(view: PlaneTasksView): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view)
  } catch {}
}

export function readStoredPlaneBoardGroup(): PlaneBoardGroupBy {
  try {
    const stored = window.localStorage.getItem(GROUP_KEY)
    return isPlaneBoardGroupBy(stored) ? stored : 'cycle'
  } catch {
    return 'cycle'
  }
}

export function storePlaneBoardGroup(group: PlaneBoardGroupBy): void {
  try {
    window.localStorage.setItem(GROUP_KEY, group)
  } catch {}
}
