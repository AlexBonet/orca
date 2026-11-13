import type { PlaneApi } from '../../../../preload/api/plane-api'
import { createPlaneApi } from '@/runtime/plane/runtime-plane-client'
import { useAppStore } from '@/store'

let api: PlaneApi | null = null

/** Plane API bound to the active runtime: local IPC, or the paired server when one is selected. */
export function planeApi(): PlaneApi {
  api ??= createPlaneApi(() => useAppStore.getState().settings)
  return api
}
