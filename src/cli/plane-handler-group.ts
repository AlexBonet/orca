import type { HandlerGroup } from './handler-group-manifest'

export const PLANE_HANDLER_GROUP: HandlerGroup = {
  name: 'plane',
  keys: [
    'plane projects',
    'plane list',
    'plane issue',
    'plane meta',
    'plane update',
    'plane comment',
    'plane create',
    'plane relation add',
    'plane relation rm'
  ],
  load: async () => (await import('./handlers/plane.js')).PLANE_HANDLERS
}
