import type {
  PlaneBoard,
  PlaneComment,
  PlaneIssue,
  PlaneIssueExtras,
  PlaneIssueSummary,
  PlaneMember,
  PlaneProject
} from '../shared/plane/plane-types'

export function formatPlaneProjects(projects: PlaneProject[]): string {
  return projects.map((p) => `${p.identifier}\t${p.name}\t${p.id}`).join('\n') || 'No projects.'
}

export function formatPlaneIssueList(issues: PlaneIssueSummary[]): string {
  return (
    issues.map((i) => `${i.key}\t${i.stateName}\t${i.priority}\t${i.title}`).join('\n') ||
    'No work items.'
  )
}

function plain(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|pre|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type PlaneIssueDetailResult = {
  issue: PlaneIssue
  comments: PlaneComment[]
  extras: PlaneIssueExtras
}

export function formatPlaneIssueDetail({
  issue,
  comments,
  extras
}: PlaneIssueDetailResult): string {
  const lines = [
    `${issue.key}  ${issue.title}`,
    `Status: ${issue.stateName}  Priority: ${issue.priority}  Assignees: ${issue.assigneeNames.join(', ') || '-'}`,
    `Labels: ${issue.labels.join(', ') || '-'}  Start: ${issue.startDate ?? '-'}  Due: ${issue.targetDate ?? '-'}`,
    `Cycle: ${extras.cycles.find((c) => c.id === extras.cycleId)?.name ?? '-'}`,
    `URL: ${issue.url}`,
    '',
    plain(issue.descriptionHtml) || '(no description)'
  ]
  if (extras.subIssues.length > 0) {
    lines.push(
      '',
      'Sub-work items:',
      ...extras.subIssues.map((s) => `  ${s.key}\t${s.stateName}\t${s.title}`)
    )
  }
  for (const relation of extras.relations) {
    lines.push(
      '',
      `${relation.type}:`,
      ...relation.issues.map((r) => `  ${r.key}\t${r.stateName}\t${r.title}`)
    )
  }
  if (comments.length > 0) {
    lines.push('', 'Comments:')
    for (const comment of comments) {
      lines.push(
        `  ${comment.authorName} (${comment.createdAt}):`,
        `    ${plain(comment.bodyHtml).replace(/\n/g, '\n    ')}`
      )
    }
  }
  return lines.join('\n')
}

export type PlaneMetaResult = { board: PlaneBoard; members: PlaneMember[] }

export function formatPlaneMeta({ board, members }: PlaneMetaResult): string {
  return [
    `States: ${board.states.map((s) => s.name).join(', ') || '-'}`,
    `Labels: ${board.labels.map((l) => l.name).join(', ') || '-'}`,
    `Cycles: ${board.cycles.map((c) => c.name).join(', ') || '-'}`,
    `Members: ${members.map((m) => m.displayName).join(', ') || '-'}`
  ].join('\n')
}
