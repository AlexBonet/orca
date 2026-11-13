import { useCallback } from 'react'
import type { PlaneIssueSummary } from '../../../../shared/plane/plane-types'
import { buildPlaneWorkspaceName } from '../../../../shared/plane/plane-workspace-name'
import { useAppStore } from '@/store'

export const PLANE_CARD_CLASS =
  'mt-3 flex min-h-0 min-w-0 max-h-full flex-col overflow-hidden rounded-md border border-border/50 bg-muted/50 shadow-sm'

export function PlaneStateMessage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</div>
}

export function useStartPlaneWorkspace(): (
  issue: Pick<PlaneIssueSummary, 'key' | 'title' | 'url'>
) => void {
  const openModal = useAppStore((s) => s.openModal)
  return useCallback(
    (issue) => {
      openModal('new-workspace-composer', {
        linkedWorkItem: {
          type: 'issue',
          provider: 'plane',
          number: 0,
          title: `${issue.key} ${issue.title}`,
          url: issue.url,
          identifier: issue.key
        },
        prefilledName: buildPlaneWorkspaceName(issue),
        telemetrySource: 'sidebar'
      })
    },
    [openModal]
  )
}
