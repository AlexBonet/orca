import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { TaskSourceShowInTasksStep } from '@/components/settings/tasks/TaskSourceShowInTasksStep'
import { TaskSourceStepRow } from '@/components/settings/tasks/TaskSourceStepRow'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { isPlaneAgentWritePolicy } from '../../../../shared/plane/plane-types'
import { PlaneConnectDialog } from './PlaneConnectDialog'
import { planeApi } from './plane-api'

export function PlaneSetupSteps(props: {
  connected: boolean
  checking: boolean
  visible: boolean
  canHide: boolean
  onToggleVisible: () => void
}): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false)
  const workspaceSlug = useAppStore((s) => s.planeStatus.workspaceSlug)
  const disconnectPlane = useAppStore((s) => s.disconnectPlane)
  const agentWritePolicy = useAppStore((s) => s.planeStatus.agentWritePolicy)
  const checkPlaneConnection = useAppStore((s) => s.checkPlaneConnection)
  const state = props.checking ? 'in-progress' : props.connected ? 'done' : 'pending'

  return (
    <>
      <ol className="divide-y divide-border/50">
        <TaskSourceStepRow
          index={1}
          state={state}
          title={translate('plane.setup.connectTitle', 'Connect Plane')}
          description={
            props.connected && workspaceSlug
              ? translate('plane.setup.connectedDescription', 'Connected to workspace {{slug}}.', {
                  slug: workspaceSlug
                })
              : translate(
                  'plane.setup.connectDescription',
                  'Add your Plane Cloud workspace and a personal API key.'
                )
          }
          action={
            props.connected ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void disconnectPlane()}
              >
                {translate('plane.setup.disconnect', 'Disconnect')}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
                {translate('plane.setup.add', 'Add Plane access')}
              </Button>
            )
          }
        />
        <TaskSourceShowInTasksStep
          index={2}
          providerLabel="Plane"
          visible={props.visible}
          canHide={props.canHide}
          onToggleVisible={props.onToggleVisible}
        />
        {props.connected ? (
          <TaskSourceStepRow
            index={3}
            state="done"
            title={translate('plane.setup.agentWritesTitle', 'Agent writes')}
            description={translate(
              'plane.setup.agentWritesDescription',
              'Controls changes agents make to Plane through the orca CLI. Reading is always allowed.'
            )}
            action={
              <Select
                value={agentWritePolicy}
                onValueChange={(policy) => {
                  if (isPlaneAgentWritePolicy(policy)) {
                    void planeApi()
                      .setAgentWritePolicy({ policy })
                      .then(() => checkPlaneConnection())
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-40"
                  aria-label={translate('plane.setup.agentWritesTitle', 'Agent writes')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirm">
                    {translate('plane.setup.agentWritesConfirm', 'Ask each time')}
                  </SelectItem>
                  <SelectItem value="allow">
                    {translate('plane.setup.agentWritesAllow', 'Allow')}
                  </SelectItem>
                  <SelectItem value="deny">
                    {translate('plane.setup.agentWritesDeny', 'Block')}
                  </SelectItem>
                </SelectContent>
              </Select>
            }
          />
        ) : null}
      </ol>
      <PlaneConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
