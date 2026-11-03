import { describe, expect, it } from 'vitest'
import { getGitReposInsideFolder } from './folder-workspace-nested-repos'

const repo = (id: string, path: string, kind: 'git' | 'folder' = 'git', connectionId?: string) => ({
  id,
  path,
  kind,
  ...(connectionId ? { connectionId } : {})
})

describe('getGitReposInsideFolder', () => {
  it('returns only local git repos strictly inside the folder, sorted by path', () => {
    const result = getGitReposInsideFolder(
      [
        repo('web', '/w/pou/pou-web'),
        repo('self', '/w/pou'),
        repo('android', '/w/pou/pou-android'),
        repo('other', '/w/pouch/x'),
        repo('plain', '/w/pou/docs', 'folder'),
        repo('remote', '/w/pou/remote', 'git', 'ssh-1')
      ],
      '/w/pou/'
    )
    expect(result.map((r) => r.id)).toEqual(['android', 'web'])
  })
})
