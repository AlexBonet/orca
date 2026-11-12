import type { StateCreator } from 'zustand'
import type {
  PlaneConnectArgs,
  PlaneConnectionStatus,
  PlaneResult,
  PlaneViewer
} from '../../../../shared/plane/plane-types'
import { getProviderRuntimeContextKey } from '@/runtime/hosts/observations/provider-runtime-context'
import { createPlaneApi } from '@/runtime/plane/runtime-plane-client'
import type { AppState } from '../types'

export type PlaneSlice = {
  planeStatus: PlaneConnectionStatus
  planeStatusChecked: boolean
  planeStatusContextKey: string | null
  checkPlaneConnection: () => Promise<void>
  connectPlane: (args: PlaneConnectArgs) => Promise<PlaneResult<{ viewer: PlaneViewer }>>
  disconnectPlane: () => Promise<void>
}

const DISCONNECTED_STATUS: PlaneConnectionStatus = {
  connected: false,
  workspaceSlug: null,
  viewer: null,
  credentialProtection: null,
  agentWritePolicy: 'confirm'
}

export const createPlaneSlice: StateCreator<AppState, [], [], PlaneSlice> = (set, get) => {
  const api = createPlaneApi(() => get().settings)
  return {
    planeStatus: DISCONNECTED_STATUS,
    planeStatusChecked: false,
    planeStatusContextKey: null,

    checkPlaneConnection: async () => {
      const contextKey = getProviderRuntimeContextKey(get().settings)
      if (get().planeStatusContextKey !== contextKey) {
        set({ planeStatusChecked: false })
      }
      let status = DISCONNECTED_STATUS
      try {
        status = await api.status()
      } catch {}
      // A runtime switch during the read makes this answer belong to another host.
      if (getProviderRuntimeContextKey(get().settings) === contextKey) {
        set({ planeStatus: status, planeStatusChecked: true, planeStatusContextKey: contextKey })
      }
    },

    connectPlane: async (args) => {
      const result = await api.connect(args)
      if (result.ok) {
        await get().checkPlaneConnection()
      }
      return result
    },

    disconnectPlane: async () => {
      await api.disconnect()
      set({
        planeStatus: DISCONNECTED_STATUS,
        planeStatusChecked: true,
        planeStatusContextKey: getProviderRuntimeContextKey(get().settings)
      })
    }
  }
}
