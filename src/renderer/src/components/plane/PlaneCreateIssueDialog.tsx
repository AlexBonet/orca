import { useId, useLayoutEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import {
  PLANE_PRIORITIES,
  isPlanePriority,
  type PlanePriority,
  type PlaneProject
} from '../../../../shared/plane/plane-types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { planeApi } from './plane-api'

export function PlaneCreateIssueDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  parent,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: PlaneProject[]
  defaultProjectId: string | null
  /** Creates the work item as a sub-work item of this one, in the same project. */
  parent?: { id: string; projectId: string; key: string }
  onCreated: (key: string) => void
}): React.JSX.Element {
  const mountedRef = useMountedRef()
  const titleId = useId()
  const descriptionId = useId()
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PlanePriority>('none')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (open) {
      setProjectId(parent?.projectId ?? defaultProjectId ?? projects[0]?.id ?? '')
      setTitle('')
      setDescription('')
      setPriority('none')
      setCreating(false)
      setError(null)
    }
  }, [open, defaultProjectId, projects, parent])

  const canSubmit = Boolean(projectId && title.trim()) && !creating

  const create = async (): Promise<void> => {
    if (!canSubmit) {
      return
    }
    setCreating(true)
    setError(null)
    try {
      const result = await planeApi().createIssue({
        projectId,
        title: title.trim(),
        description,
        priority,
        ...(parent ? { parentId: parent.id } : {})
      })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        onOpenChange(false)
        onCreated(result.key)
        return
      }
      setError(result.error)
    } catch {
      if (mountedRef.current) {
        setError(translate('plane.create.failed', 'Could not create the work item.'))
      }
    } finally {
      if (mountedRef.current) {
        setCreating(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !creating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {parent
              ? `${translate('plane.create.subTitle', 'New sub-work item of')} ${parent.key}`
              : translate('plane.create.title', 'New Plane work item')}
          </DialogTitle>
          <DialogDescription>
            {translate('plane.create.description', 'Create a work item in one of your projects.')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Select
                value={projectId}
                disabled={creating || Boolean(parent)}
                onValueChange={setProjectId}
              >
                <SelectTrigger
                  size="sm"
                  className="w-56"
                  aria-label={translate('plane.tasks.projectLabel', 'Plane project')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priority}
                disabled={creating}
                onValueChange={(value) => isPlanePriority(value) && setPriority(value)}
              >
                <SelectTrigger size="sm" aria-label={translate('plane.tasks.priority', 'Priority')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANE_PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={titleId}>{translate('plane.create.titleLabel', 'Title')}</Label>
              <Input
                id={titleId}
                value={title}
                maxLength={255}
                disabled={creating}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={descriptionId}>
                {translate('plane.create.descriptionLabel', 'Description')}
              </Label>
              <Textarea
                id={descriptionId}
                rows={5}
                value={description}
                disabled={creating}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={creating}
              onClick={() => onOpenChange(false)}
            >
              {translate('plane.connect.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {translate('plane.create.submit', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
