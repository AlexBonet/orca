import { track } from '@/diagnostics/telemetry/telemetry'
import { buildNestedRepoScanTelemetry } from '../../../../../../shared/nested-repo-telemetry'

type NestedScan = Parameters<typeof buildNestedRepoScanTelemetry>[0]['scan']

export function trackLocalNestedScanResult(attemptId: string, scan: NestedScan): void {
  track(
    'add_repo_nested_scan_result',
    buildNestedRepoScanTelemetry({ attemptId, surface: 'sidebar', runtimeKind: 'local', scan })
  )
}
