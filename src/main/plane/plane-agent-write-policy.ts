import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { asPlaneRecord } from '../../shared/plane/plane-json'
import {
  isPlaneAgentWritePolicy,
  type PlaneAgentWritePolicy,
  type PlaneResult
} from '../../shared/plane/plane-types'

const DEFAULT_POLICY: PlaneAgentWritePolicy = 'confirm'

function policyFilePath(): string {
  return join(homedir(), '.orca', 'plane-agent-policy.json')
}

export function getPlaneAgentWritePolicy(): PlaneAgentWritePolicy {
  const path = policyFilePath()
  if (!existsSync(path)) {
    return DEFAULT_POLICY
  }
  try {
    const policy = asPlaneRecord(JSON.parse(readFileSync(path, { encoding: 'utf-8' })))?.writes
    return isPlaneAgentWritePolicy(policy) ? policy : DEFAULT_POLICY
  } catch {
    return DEFAULT_POLICY
  }
}

export function setPlaneAgentWritePolicy(policy: PlaneAgentWritePolicy): void {
  const path = policyFilePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ writes: policy }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

type PlaneAgentWritePrompt = (summary: string) => Promise<boolean>

// Headless hosts register no prompt, so an unanswerable prompt must not become an approval.
let promptUser: PlaneAgentWritePrompt | null = null

export function setPlaneAgentWritePrompt(prompt: PlaneAgentWritePrompt | null): void {
  promptUser = prompt
}

async function askUser(summary: string): Promise<boolean> {
  try {
    return promptUser ? await promptUser(summary) : false
  } catch {
    return false
  }
}

/** Gates writes that arrive through the agent CLI; the app UI is never gated. */
export async function authorizePlaneAgentWrite(summary: string): Promise<PlaneResult<object>> {
  const policy = getPlaneAgentWritePolicy()
  if (policy === 'allow') {
    return { ok: true }
  }
  if (policy === 'deny') {
    return {
      ok: false,
      error: 'Plane writes from agents are blocked. Change this in Settings > Tasks > Plane.'
    }
  }
  return (await askUser(summary))
    ? { ok: true }
    : {
        ok: false,
        error:
          'The Plane change was not approved. Approve the prompt in Orca, or allow agent writes in Settings > Tasks > Plane.'
      }
}
