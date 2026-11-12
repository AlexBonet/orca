import { registerJiraHandlers } from './jira/register-handlers'
import { registerLinearHandlers } from './linear/register-handlers'
import { registerPlaneHandlers } from './plane/register-handlers'

export function registerTaskProviderHandlers(): void {
  registerLinearHandlers()
  registerJiraHandlers()
  registerPlaneHandlers()
}
