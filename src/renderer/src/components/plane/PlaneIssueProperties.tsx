import { useState } from 'react'
import { Tag } from 'lucide-react'
import { toast } from 'sonner'
import type {
  PlaneIssue,
  PlaneIssueExtras,
  PlaneIssueUpdate
} from '../../../../shared/plane/plane-types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { PlaneLabelChip } from './PlaneBoardCard'
import { planeApi } from './plane-api'

const NO_CYCLE = '__no-cycle__'

export function PlaneIssueProperties({
  issue,
  extras,
  onChanged
}: {
  issue: PlaneIssue
  extras: PlaneIssueExtras | null
  onChanged: () => void
}): React.JSX.Element {
  const [saving, setSaving] = useState(false)

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

  const selectedLabelIds = issue.labelItems.map((label) => label.id)
  const toggleLabel = (labelId: string, checked: boolean): void => {
    void apply({
      labelIds: checked
        ? [...selectedLabelIds, labelId]
        : selectedLabelIds.filter((id) => id !== labelId)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {translate('plane.detail.labels', 'Labels')}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {issue.labelItems.map((label) => (
            <PlaneLabelChip key={label.id} label={label} />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={saving || !extras || extras.labels.length === 0}
                aria-label={translate('plane.detail.editLabels', 'Edit labels')}
              >
                <Tag className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56">
              <ul className="max-h-64 overflow-y-auto scrollbar-sleek">
                {extras?.labels.map((label) => (
                  <li key={label.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      <Checkbox
                        checked={selectedLabelIds.includes(label.id)}
                        onCheckedChange={(checked) => toggleLabel(label.id, checked === true)}
                      />
                      <PlaneLabelChip label={label} />
                    </label>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {translate('plane.detail.startDate', 'Start date')}
          </span>
          <Input
            type="date"
            className="h-8"
            value={issue.startDate ?? ''}
            disabled={saving}
            onChange={(event) => void apply({ startDate: event.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {translate('plane.detail.dueDate', 'Due date')}
          </span>
          <Input
            type="date"
            className="h-8"
            value={issue.targetDate ?? ''}
            disabled={saving}
            onChange={(event) => void apply({ targetDate: event.target.value || null })}
          />
        </label>
      </div>
      {extras && extras.cycles.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {translate('plane.detail.cycle', 'Cycle')}
          </span>
          <Select
            value={extras.cycleId ?? NO_CYCLE}
            disabled={saving}
            onValueChange={(value) => void apply({ cycleId: value === NO_CYCLE ? null : value })}
          >
            <SelectTrigger size="sm" aria-label={translate('plane.detail.cycle', 'Cycle')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CYCLE}>
                {translate('plane.board.noCycle', 'No cycle')}
              </SelectItem>
              {extras.cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}
