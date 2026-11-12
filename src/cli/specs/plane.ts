import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

const UPDATE_FLAGS = [
  'title',
  'status',
  'priority',
  'assignee',
  'labels',
  'start-date',
  'due-date',
  'cycle',
  'parent'
]

export const PLANE_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['plane', 'projects'],
    summary: 'List Plane projects',
    usage: 'orca plane projects [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['orca plane projects --json']
  },
  {
    path: ['plane', 'list'],
    summary: 'List Plane work items',
    usage:
      'orca plane list [--project <identifier|id>] [--filter assigned|created|open|all] [--limit <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'project', 'filter', 'limit'],
    examples: ['orca plane list --project POU --filter open --limit 50 --json']
  },
  {
    path: ['plane', 'issue'],
    summary: 'Read a Plane work item with description, comments, sub-items and relations',
    usage: 'orca plane issue <key> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'key'],
    positionalArgs: ['key'],
    examples: ['orca plane issue POU-320', 'orca plane issue POU-320 --json']
  },
  {
    path: ['plane', 'meta'],
    summary: 'List a project’s states, labels, cycles and members (names accepted by update)',
    usage: 'orca plane meta --project <identifier|id> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'project'],
    examples: ['orca plane meta --project POU --json']
  },
  {
    path: ['plane', 'update'],
    summary: 'Change a Plane work item; names are resolved for you',
    usage:
      'orca plane update <key> [--title <text>] [--status <name>] [--priority none|urgent|high|medium|low] [--assignee me|<name>|none] [--labels <a,b>|none] [--start-date <YYYY-MM-DD>|none] [--due-date <YYYY-MM-DD>|none] [--cycle <name>|none] [--parent <key>|none] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'key', ...UPDATE_FLAGS],
    positionalArgs: ['key'],
    notes: ['Writes follow the Plane agent write policy set in Settings > Tasks > Plane.'],
    examples: ['orca plane update POU-320 --status "In Progress" --assignee me']
  },
  {
    path: ['plane', 'comment'],
    summary: 'Add a comment to a Plane work item',
    usage: 'orca plane comment <key> (--body <text> | --body-file <path|->) [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'key', 'body', 'body-file'],
    positionalArgs: ['key'],
    examples: ['orca plane comment POU-320 --body "Implemented in branch feat/x"']
  },
  {
    path: ['plane', 'create'],
    summary: 'Create a Plane work item',
    usage:
      'orca plane create --project <identifier|id> --title <text> [--body <text> | --body-file <path|->] [--priority <p>] [--status <name>] [--labels <a,b>] [--cycle <name>] [--parent <key>] [--json]',
    allowedFlags: [
      ...GLOBAL_FLAGS,
      'project',
      'title',
      'body',
      'body-file',
      'priority',
      'status',
      'labels',
      'cycle',
      'parent'
    ],
    examples: ['orca plane create --project POU --title "Fix login" --parent POU-320 --json']
  },
  {
    path: ['plane', 'relation', 'add'],
    summary: 'Relate two Plane work items',
    usage:
      'orca plane relation add <key> --type blocking|blocked_by|duplicate|relates_to --to <key> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'key', 'type', 'to'],
    positionalArgs: ['key'],
    examples: ['orca plane relation add POU-320 --type blocked_by --to POU-319']
  },
  {
    path: ['plane', 'relation', 'rm'],
    summary: 'Remove a relation between two Plane work items',
    usage:
      'orca plane relation rm <key> --type blocking|blocked_by|duplicate|relates_to --to <key> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'key', 'type', 'to'],
    positionalArgs: ['key'],
    examples: ['orca plane relation rm POU-320 --type blocked_by --to POU-319']
  }
]
