const PLANE_APP_ORIGIN = 'https://app.plane.so'
const ISSUE_KEY_PATTERN = /^([A-Za-z][A-Za-z0-9_]*)-(\d+)$/

export function normalizePlaneWorkspaceSlug(value: string): string | null {
  const slug = value.trim()
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug) ? slug : null
}

export function normalizePlaneIssueKey(value: string): string | null {
  const match = ISSUE_KEY_PATTERN.exec(value.trim())
  return match ? `${match[1].toUpperCase()}-${match[2]}` : null
}

export function buildPlaneIssueUrl(workspaceSlug: string, issueKey: string): string {
  return `${PLANE_APP_ORIGIN}/${encodeURIComponent(workspaceSlug)}/browse/${encodeURIComponent(issueKey)}/`
}

export function parsePlaneIssueUrl(
  value: string
): { workspaceSlug: string; issueKey: string } | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.origin !== PLANE_APP_ORIGIN) {
    return null
  }
  const [workspaceSlug, browse, rawKey] = url.pathname.split('/').filter(Boolean)
  const issueKey = rawKey ? normalizePlaneIssueKey(decodeURIComponent(rawKey)) : null
  return workspaceSlug && browse === 'browse' && issueKey
    ? { workspaceSlug: decodeURIComponent(workspaceSlug), issueKey }
    : null
}
