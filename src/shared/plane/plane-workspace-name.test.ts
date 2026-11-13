import { describe, expect, it } from 'vitest'
import { buildPlaneWorkspaceName } from './plane-workspace-name'

describe('buildPlaneWorkspaceName', () => {
  it('prefixes the lower-cased key and slugifies the title', () => {
    expect(buildPlaneWorkspaceName({ key: 'PROJ-142', title: 'Fix login redirect loop!' })).toBe(
      'proj-142-fix-login-redirect-loop'
    )
  })

  it('falls back to the key when the title has no usable characters', () => {
    expect(buildPlaneWorkspaceName({ key: 'PROJ-1', title: '???' })).toBe('proj-1')
  })
})
