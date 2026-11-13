import {
  normalizeVisibleTaskProviders as normalizeSharedVisibleTaskProviders,
  type TaskProvider
} from '../../../src/shared/work-items/task-providers'

// Plane reaches mobile through the web shell; native task and composer screens have no Plane surface.
export function normalizeVisibleTaskProviders(value: unknown): TaskProvider[] {
  const providers = normalizeSharedVisibleTaskProviders(value).filter(
    (provider) => provider !== 'plane'
  )
  return providers.length > 0 ? providers : ['github']
}
