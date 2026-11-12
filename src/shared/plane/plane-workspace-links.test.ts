import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceAttachment } from '../workspace-attachments/workspace-attachment-normalization'
import { normalizeWorkspaceLinkedItem } from '../workspace-attachments/workspace-linked-item'
import { workspaceAttachmentReferenceLabel } from '../workspace-attachments/workspace-attachments'
import { getLinkedWorkItemWorkspaceName } from '../workspace-name'
import { parseWorkspaceReferenceUrl } from '../workspace-attachments/workspace-reference-identity'

describe('plane workspace links', () => {
  it('parses a pasted Plane URL into an identifier-keyed attachment', () => {
    expect(parseWorkspaceReferenceUrl('https://app.plane.so/my-team/browse/proj-142/')).toEqual({
      provider: 'plane',
      type: 'issue',
      number: 0,
      identifier: 'PROJ-142',
      url: 'https://app.plane.so/my-team/browse/PROJ-142/'
    })
  })

  it('keeps a Plane attachment that has no numeric id', () => {
    const item = normalizeWorkspaceAttachment({
      provider: 'plane',
      type: 'issue',
      number: 0,
      identifier: 'PROJ-142',
      title: 'Fix it',
      url: 'https://app.plane.so/my-team/browse/PROJ-142/'
    })
    expect(item).toMatchObject({ provider: 'plane', identifier: 'PROJ-142' })
    expect(workspaceAttachmentReferenceLabel(item!)).toBe('PROJ-142')
  })

  it('rejects Plane pull requests and attachments without an identifier', () => {
    expect(
      normalizeWorkspaceAttachment({ provider: 'plane', type: 'pr', number: 1, identifier: 'A-1' })
    ).toBeNull()
    expect(normalizeWorkspaceAttachment({ provider: 'plane', type: 'issue', number: 0 })).toBeNull()
  })

  it('persists the identifier on a linked work item', () => {
    expect(
      normalizeWorkspaceLinkedItem({
        provider: 'plane',
        type: 'issue',
        number: 0,
        title: 'PROJ-142 Fix it',
        url: 'https://app.plane.so/my-team/browse/PROJ-142/',
        identifier: ' PROJ-142 '
      })
    ).toMatchObject({ provider: 'plane', identifier: 'PROJ-142' })
  })

  it('names the workspace after the Plane key and title', () => {
    expect(
      getLinkedWorkItemWorkspaceName({
        provider: 'plane',
        type: 'issue',
        number: 0,
        title: 'PROJ-142 Fix login redirect',
        identifier: 'PROJ-142'
      })?.seedName
    ).toBe('proj-142-fix-login-redirect')
  })
})
