import { describe, expect, it } from 'vitest'
import { normalizeVisibleTaskProviders } from './mobile-visible-task-providers'

describe('mobile visible task providers', () => {
  it('drops Plane, which only the web shell renders', () => {
    expect(normalizeVisibleTaskProviders(['github', 'plane', 'jira'])).toEqual(['github', 'jira'])
    expect(normalizeVisibleTaskProviders(undefined)).toEqual(['github', 'gitlab', 'linear', 'jira'])
  })

  it('falls back to GitHub when Plane was the only visible provider', () => {
    expect(normalizeVisibleTaskProviders(['plane'])).toEqual(['github'])
  })
})
