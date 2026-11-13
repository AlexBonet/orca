import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as NodeOs from 'node:os'

const home = vi.hoisted(() => ({ dir: '' }))
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof NodeOs>()),
  homedir: () => home.dir
}))

import {
  authorizePlaneAgentWrite,
  getPlaneAgentWritePolicy,
  setPlaneAgentWritePolicy,
  setPlaneAgentWritePrompt
} from './plane-agent-write-policy'

const prompt = vi.fn<(summary: string) => Promise<boolean>>()

describe('plane agent write policy', () => {
  beforeEach(() => {
    home.dir = mkdtempSync(join(tmpdir(), 'plane-policy-'))
    prompt.mockReset()
    setPlaneAgentWritePrompt(prompt)
  })
  afterEach(() => rmSync(home.dir, { recursive: true, force: true }))

  it('defaults to asking and persists the chosen policy', () => {
    expect(getPlaneAgentWritePolicy()).toBe('confirm')
    setPlaneAgentWritePolicy('deny')
    expect(getPlaneAgentWritePolicy()).toBe('deny')
  })

  it('asks the user and honors the answer when the policy is confirm', async () => {
    prompt.mockResolvedValueOnce(true)
    await expect(authorizePlaneAgentWrite('Update PROJ-1')).resolves.toEqual({ ok: true })
    prompt.mockResolvedValueOnce(false)
    await expect(authorizePlaneAgentWrite('Update PROJ-1')).resolves.toMatchObject({ ok: false })
  })

  it('never prompts for allow or deny', async () => {
    setPlaneAgentWritePolicy('allow')
    await expect(authorizePlaneAgentWrite('x')).resolves.toEqual({ ok: true })
    setPlaneAgentWritePolicy('deny')
    await expect(authorizePlaneAgentWrite('x')).resolves.toMatchObject({ ok: false })
    expect(prompt).not.toHaveBeenCalled()
  })

  it('refuses when the host has no prompt to show', async () => {
    setPlaneAgentWritePrompt(null)
    await expect(authorizePlaneAgentWrite('x')).resolves.toMatchObject({ ok: false })
  })

  it('treats an unanswerable prompt as a refusal', async () => {
    prompt.mockRejectedValueOnce(new Error('no display'))
    await expect(authorizePlaneAgentWrite('x')).resolves.toMatchObject({ ok: false })
  })
})
