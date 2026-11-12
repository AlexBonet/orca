const STORAGE_KEY = 'orca.plane.selectedProjectId'
export const ALL_PLANE_PROJECTS = 'all'

export function readStoredPlaneProjectId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || ALL_PLANE_PROJECTS
  } catch {
    return ALL_PLANE_PROJECTS
  }
}

export function storePlaneProjectId(projectId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, projectId)
  } catch {}
}
