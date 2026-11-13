import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  PLANE_PRIORITIES,
  isPlanePriority,
  type PlaneIssue,
  type PlaneIssueUpdate,
  type PlaneMember,
  type PlaneState
} from '../../../../shared/plane/plane-types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { planeApi } from './plane-api'

const UNASSIGNED = '__unassigned__'
const MULTIPLE = '__multiple__'

export function PlaneIssueControls({
  issue,
  onChanged,
  className
}: {
  issue: PlaneIssue
  onChanged: () => void
  className?: string
}): React.JSX.Element {
  const [states, setStates] = useState<PlaneState[]>([])
  const [members, setMembers] = useState<PlaneMember[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      planeApi().listStates({ projectId: issue.projectId }),
      planeApi().listMembers({ projectId: issue.projectId })
    ])
      .then(([statesResult, membersResult]) => {
        if (!cancelled) {
          setStates(statesResult.ok ? statesResult.states : [])
          setMembers(membersResult.ok ? membersResult.members : [])
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [issue.projectId])

  const apply = async (updates: PlaneIssueUpdate): Promise<void> => {
    setSaving(true)
    try {
      const result = await planeApi().updateIssue({ key: issue.key, updates })
      if (result.ok) {
        onChanged()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error(translate('plane.tasks.updateFailed', 'Could not update the work item.'))
    } finally {
      setSaving(false)
    }
  }

  const assigneeValue =
    issue.assigneeIds.length === 0
      ? UNASSIGNED
      : issue.assigneeIds.length === 1
        ? issue.assigneeIds[0]
        : MULTIPLE

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2'}>
      <Select
        value={issue.stateId}
        disabled={saving || states.length === 0}
        onValueChange={(stateId) => void apply({ stateId })}
      >
        <SelectTrigger size="sm" aria-label={translate('plane.tasks.state', 'State')}>
          <SelectValue placeholder={issue.stateName} />
        </SelectTrigger>
        <SelectContent>
          {states.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={assigneeValue}
        disabled={saving || members.length === 0}
        onValueChange={(value) =>
          void apply({ assigneeIds: value === UNASSIGNED || value === MULTIPLE ? [] : [value] })
        }
      >
        <SelectTrigger size="sm" aria-label={translate('plane.tasks.assignee', 'Assignee')}>
          <SelectValue placeholder={issue.assigneeNames.join(', ')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>
            {translate('plane.tasks.unassigned', 'Unassigned')}
          </SelectItem>
          {assigneeValue === MULTIPLE ? (
            <SelectItem value={MULTIPLE} disabled>
              {issue.assigneeNames.join(', ')}
            </SelectItem>
          ) : null}
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={issue.priority}
        disabled={saving}
        onValueChange={(priority) => isPlanePriority(priority) && void apply({ priority })}
      >
        <SelectTrigger size="sm" aria-label={translate('plane.tasks.priority', 'Priority')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLANE_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priority}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
