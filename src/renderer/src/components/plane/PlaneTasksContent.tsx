import { useCallback, useEffect, useRef, useState } from 'react'
import { Columns3, GitBranch, List, LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import {
  isPlaneIssueFilter,
  type PlaneIssueFilter,
  type PlaneIssueSummary,
  type PlaneProject
} from '../../../../shared/plane/plane-types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { translate } from '@/i18n/i18n'
import { getProviderRuntimeContextKey } from '@/runtime/hosts/observations/provider-runtime-context'
import { useAppStore } from '@/store'
import { PlaneConnectDialog } from './PlaneConnectDialog'
import { PlaneOpenByReference } from './PlaneOpenByReference'
import { PlaneCreateIssueDialog } from './PlaneCreateIssueDialog'
import { PlaneBoardView } from './PlaneBoardView'
import { PlaneIssueDetail } from './PlaneIssueDetail'
import { PLANE_CARD_CLASS, PlaneStateMessage, useStartPlaneWorkspace } from './plane-task-chrome'
import {
  ALL_PLANE_PROJECTS,
  readStoredPlaneProjectId,
  storePlaneProjectId
} from './plane-project-selection-storage'
import {
  readStoredPlaneTasksView,
  storePlaneTasksView,
  type PlaneTasksView
} from './plane-view-storage'
import { planeApi } from './plane-api'

export function PlaneTasksContent(): React.JSX.Element {
  const status = useAppStore((s) => s.planeStatus)
  const statusChecked = useAppStore((s) => s.planeStatusChecked)
  const planeStatusContextKey = useAppStore((s) => s.planeStatusContextKey)
  const checkPlaneConnection = useAppStore((s) => s.checkPlaneConnection)
  const startWorkspace = useStartPlaneWorkspace()
  const runtimeContextKey = useAppStore((s) => getProviderRuntimeContextKey(s.settings))
  const [filter, setFilter] = useState<PlaneIssueFilter>('assigned')
  const [issues, setIssues] = useState<PlaneIssueSummary[]>([])
  const [projects, setProjects] = useState<PlaneProject[]>([])
  const [projectId, setProjectId] = useState<string>(readStoredPlaneProjectId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<PlaneTasksView>(readStoredPlaneTasksView)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    void checkPlaneConnection()
  }, [checkPlaneConnection, runtimeContextKey])

  useEffect(() => {
    if (!status.connected) {
      return
    }
    let cancelled = false
    void planeApi()
      .listProjects()
      .then((result) => {
        if (cancelled || !result.ok) {
          return
        }
        const sorted = [...result.projects].sort((a, b) => a.name.localeCompare(b.name))
        setProjects(sorted)
        // A remembered project may have been archived or the workspace changed.
        setProjectId((current) =>
          current === ALL_PLANE_PROJECTS || sorted.some((project) => project.id === current)
            ? current
            : ALL_PLANE_PROJECTS
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status.connected, status.workspaceSlug, runtimeContextKey])

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await planeApi().listIssues({
        filter,
        ...(projectId === ALL_PLANE_PROJECTS ? {} : { projectId })
      })
      if (requestId !== requestRef.current) {
        return
      }
      if (result.ok) {
        setIssues(result.issues)
      } else {
        setIssues([])
        setError(result.error)
      }
    } catch {
      if (requestId === requestRef.current) {
        setError(translate('plane.tasks.loadFailed', 'Unable to load Plane work items.'))
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [filter, projectId])

  const boardActive = view === 'board' && projectId !== ALL_PLANE_PROJECTS

  useEffect(() => {
    if (status.connected && !boardActive) {
      void load()
    }
  }, [status.connected, boardActive, load, runtimeContextKey])

  if (!statusChecked || planeStatusContextKey !== runtimeContextKey) {
    return (
      <div className={PLANE_CARD_CLASS}>
        <PlaneStateMessage>
          <LoaderCircle className="mx-auto size-4 animate-spin" />
        </PlaneStateMessage>
      </div>
    )
  }

  if (!status.connected) {
    return (
      <div className={PLANE_CARD_CLASS}>
        <PlaneStateMessage>
          <p>{translate('plane.tasks.notConnected', 'Connect Plane to browse your work items.')}</p>
          <Button type="button" size="sm" className="mt-3" onClick={() => setConnectOpen(true)}>
            {translate('plane.setup.add', 'Add Plane access')}
          </Button>
        </PlaneStateMessage>
        <PlaneConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </div>
    )
  }

  if (selectedKey) {
    return (
      <PlaneIssueDetail
        issueKey={selectedKey}
        onBack={() => setSelectedKey(null)}
        onOpenIssue={setSelectedKey}
      />
    )
  }

  return (
    <div className={PLANE_CARD_CLASS}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
        <Select
          value={projectId}
          onValueChange={(value) => {
            setProjectId(value)
            storePlaneProjectId(value)
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-48"
            aria-label={translate('plane.tasks.projectLabel', 'Plane project')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PLANE_PROJECTS}>
              {translate('plane.tasks.allProjects', 'All projects')}
            </SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view}
          aria-label={translate('plane.tasks.viewLabel', 'Plane view')}
          onValueChange={(value) => {
            if (value === 'list' || value === 'board') {
              setView(value)
              storePlaneTasksView(value)
            }
          }}
        >
          <ToggleGroupItem value="list" aria-label={translate('plane.tasks.viewList', 'List')}>
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="board" aria-label={translate('plane.tasks.viewBoard', 'Board')}>
            <Columns3 className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        {boardActive ? null : (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={filter}
            aria-label={translate('plane.tasks.filterLabel', 'Plane work item filter')}
            onValueChange={(value) => isPlaneIssueFilter(value) && setFilter(value)}
          >
            <ToggleGroupItem value="assigned">
              {translate('plane.tasks.assigned', 'Assigned')}
            </ToggleGroupItem>
            <ToggleGroupItem value="created">
              {translate('plane.tasks.created', 'Created')}
            </ToggleGroupItem>
            <ToggleGroupItem value="open">
              {translate('plane.tasks.allOpen', 'All open')}
            </ToggleGroupItem>
            <ToggleGroupItem value="all">{translate('plane.tasks.all', 'All')}</ToggleGroupItem>
          </ToggleGroup>
        )}
        <PlaneOpenByReference
          workspaceSlug={status.workspaceSlug}
          onOpen={setSelectedKey}
          className="ml-auto"
        />
        <Button
          type="button"
          size="sm"
          disabled={projects.length === 0}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          {translate('plane.tasks.newItem', 'New work item')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          aria-label={translate('plane.tasks.refresh', 'Refresh')}
          onClick={() => void load()}
        >
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
        </Button>
      </div>
      {view === 'board' && !boardActive ? (
        <PlaneStateMessage>
          {translate('plane.board.pickProject', 'Select a project to see its board.')}
        </PlaneStateMessage>
      ) : null}
      {boardActive ? (
        <PlaneBoardView projectId={projectId} onOpen={setSelectedKey} />
      ) : view === 'board' ? null : (
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
          {error ? (
            <PlaneStateMessage>{error}</PlaneStateMessage>
          ) : loading && issues.length === 0 ? (
            <PlaneStateMessage>
              <LoaderCircle className="mx-auto size-4 animate-spin" />
            </PlaneStateMessage>
          ) : issues.length === 0 ? (
            <PlaneStateMessage>
              {translate('plane.tasks.empty', 'No work items found.')}
            </PlaneStateMessage>
          ) : (
            <ul className="divide-y divide-border/50">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="group flex items-center gap-3 px-3 py-2 hover:bg-muted"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => setSelectedKey(issue.key)}
                  >
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {issue.key}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                    {projectId === ALL_PLANE_PROJECTS ? (
                      <span className="max-w-32 shrink-0 truncate text-xs text-muted-foreground">
                        {issue.projectName}
                      </span>
                    ) : null}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {issue.stateName}
                    </span>
                  </button>
                  <span className="opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startWorkspace(issue)}
                    >
                      <GitBranch className="size-4" />
                      {translate('plane.tasks.startWorkspace', 'Start workspace')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <PlaneCreateIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        defaultProjectId={projectId === ALL_PLANE_PROJECTS ? null : projectId}
        onCreated={setSelectedKey}
      />
    </div>
  )
}
