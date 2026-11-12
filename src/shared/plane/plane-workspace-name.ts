const MAX_SLUG_LENGTH = 52

export function buildPlaneWorkspaceName(issue: { key: string; title: string }): string {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
  return `${issue.key.toLowerCase()}${slug ? `-${slug}` : ''}`
}
