import { useEffect, useState } from 'react'

export type FolderProjectSubRepo = { path: string; name: string }

const SUB_REPO_SCAN_INTERVAL_MS = 60_000
const SUB_REPO_SCAN_DEPTH = 3

/** Repos inside a plain folder project, found by the same scanner the nested-import flow uses (nothing is imported). */
export function useFolderProjectSubRepos(
  folderPath: string | null,
  enabled: boolean
): { repos: FolderProjectSubRepo[]; loading: boolean } {
  const [state, setState] = useState<{ path: string; repos: FolderProjectSubRepo[] } | null>(null)

  useEffect(() => {
    if (!enabled || !folderPath) {
      return
    }
    let cancelled = false
    const scan = (): void => {
      window.api.projectGroups
        .scanNested({ path: folderPath, options: { maxDepth: SUB_REPO_SCAN_DEPTH } })
        .then((result) => {
          if (cancelled) {
            return
          }
          const repos = result.repos
            .map((candidate) => ({ path: candidate.path, name: candidate.displayName }))
            .sort((a, b) => a.name.localeCompare(b.name))
          setState((previous) =>
            previous?.path === folderPath &&
            previous.repos.length === repos.length &&
            previous.repos.every((repo, index) => repo.path === repos[index].path)
              ? previous
              : { path: folderPath, repos }
          )
        })
        .catch((error: unknown) => {
          console.warn('[FolderSourceControl] sub-repo scan failed', folderPath, error)
        })
    }
    scan()
    const timer = setInterval(scan, SUB_REPO_SCAN_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled, folderPath])

  const current = state?.path === folderPath ? state.repos : []
  return { repos: current, loading: enabled && folderPath !== null && state?.path !== folderPath }
}
