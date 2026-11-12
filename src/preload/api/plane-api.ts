import type {
  PlaneAgentWritePolicy,
  PlaneBoard,
  PlaneComment,
  PlaneIssueExtras,
  PlaneSetRelationArgs,
  PlaneConnectionStatus,
  PlaneCreateIssueArgs,
  PlaneIssueUpdate,
  PlaneMember,
  PlaneState,
  PlaneIssue,
  PlaneIssueSummary,
  PlaneListIssuesArgs,
  PlaneProject,
  PlaneResult,
  PlaneViewer
} from '../../shared/plane/plane-types'

export type PlaneApi = {
  connect: (args: {
    workspaceSlug: string
    apiKey: string
  }) => Promise<PlaneResult<{ viewer: PlaneViewer }>>
  disconnect: () => Promise<void>
  status: () => Promise<PlaneConnectionStatus>
  testConnection: () => Promise<PlaneResult<{ viewer: PlaneViewer }>>
  listProjects: () => Promise<PlaneResult<{ projects: PlaneProject[] }>>
  listIssues: (args?: PlaneListIssuesArgs) => Promise<PlaneResult<{ issues: PlaneIssueSummary[] }>>
  getIssue: (args: { key: string }) => Promise<PlaneResult<{ issue: PlaneIssue }>>
  issueComments: (args: { key: string }) => Promise<PlaneResult<{ comments: PlaneComment[] }>>
  listStates: (args: { projectId: string }) => Promise<PlaneResult<{ states: PlaneState[] }>>
  listMembers: (args: { projectId: string }) => Promise<PlaneResult<{ members: PlaneMember[] }>>
  updateIssue: (args: { key: string; updates: PlaneIssueUpdate }) => Promise<PlaneResult<object>>
  addComment: (args: { key: string; body: string }) => Promise<PlaneResult<object>>
  createIssue: (args: PlaneCreateIssueArgs) => Promise<PlaneResult<{ key: string }>>
  setAgentWritePolicy: (args: { policy: PlaneAgentWritePolicy }) => Promise<{ ok: true }>
  getBoard: (args: { projectId: string }) => Promise<PlaneResult<{ board: PlaneBoard }>>
  issueExtras: (args: { key: string }) => Promise<PlaneResult<{ extras: PlaneIssueExtras }>>
  setRelation: (args: PlaneSetRelationArgs) => Promise<PlaneResult<object>>
}
