import { describe, expect, it } from 'vitest'
import {
  buildPlaneIssueUrl,
  normalizePlaneIssueKey,
  normalizePlaneWorkspaceSlug,
  parsePlaneIssueUrl
} from './plane-issue-url'

describe('plane issue urls', () => {
  it('round-trips a browse URL', () => {
    const url = buildPlaneIssueUrl('my-team', 'PROJ-142')
    expect(parsePlaneIssueUrl(url)).toEqual({ workspaceSlug: 'my-team', issueKey: 'PROJ-142' })
  })

  it('upper-cases keys and rejects other origins', () => {
    expect(normalizePlaneIssueKey(' proj-7 ')).toBe('PROJ-7')
    expect(parsePlaneIssueUrl('https://evil.example/my-team/browse/PROJ-1/')).toBeNull()
    expect(parsePlaneIssueUrl('https://app.plane.so/my-team/projects/')).toBeNull()
  })

  it('rejects slugs that could alter the API path', () => {
    expect(normalizePlaneWorkspaceSlug('my-team')).toBe('my-team')
    expect(normalizePlaneWorkspaceSlug('../admin')).toBeNull()
    expect(normalizePlaneWorkspaceSlug('a/b')).toBeNull()
  })
})
