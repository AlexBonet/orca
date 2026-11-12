import { dialog } from 'electron'
import { setPlaneAgentWritePrompt } from '../plane/plane-agent-write-policy'

export function registerElectronPlaneAgentWritePrompt(): void {
  setPlaneAgentWritePrompt(async (summary) => {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Allow', 'Deny'],
      defaultId: 1,
      cancelId: 1,
      message: 'An agent wants to change Plane',
      detail: summary
    })
    return response === 0
  })
}
