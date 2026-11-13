import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import {
  getRuntimeGitRepoDiscoveryHostKey,
  type RuntimeGitContext
} from '@/runtime/source-control/git/runtime-git-client-context'
import {
  cancelRuntimeGenerateCommitMessage,
  generateRuntimeCommitMessage
} from '@/runtime/source-control/git/runtime-git-generation-client'
import { resolveSourceControlAiEnabled } from '../../../../shared/source-control/ai/source-control-ai-operation-policy'
import { resolveSourceControlAiForOperation } from '../../../../shared/source-control/ai/source-control-ai-operation-resolution'
import type { Repo } from '../../../../shared/repo-types'

const LOCAL_TARGET = { kind: 'local' } as const

export type FolderProjectCommitMessageAi = {
  showGenerate: boolean
  isGenerating: boolean
  isGenerateDisabled: boolean
  generateTooltip: string | undefined
  generate: () => void
  cancel: () => void
}

/** Same AI settings and backend as the Git panel; sub-repos have no worktree, so calls go by path. */
export function useFolderProjectCommitMessage({
  repoPath,
  projectRepo,
  stagedCount,
  hasMessage,
  busy,
  onMessage
}: {
  repoPath: string
  projectRepo: Repo | null | undefined
  stagedCount: number
  hasMessage: boolean
  busy: boolean
  onMessage: (message: string) => void
}): FolderProjectCommitMessageAi {
  const [isGenerating, setIsGenerating] = useState(false)
  const inFlight = useRef(false)
  const settings = useAppStore((state) => state.settings)
  const showGenerate = settings
    ? resolveSourceControlAiEnabled({ settings, repo: projectRepo })
    : false

  const generate = useCallback((): void => {
    const current = useAppStore.getState().settings
    if (!current || inFlight.current) {
      return
    }
    const resolved = resolveSourceControlAiForOperation({
      settings: current,
      repo: projectRepo,
      operation: 'commitMessage',
      discoveryHostKey: getRuntimeGitRepoDiscoveryHostKey(LOCAL_TARGET, projectRepo, null)
    })
    if (!resolved.ok) {
      toast.error(resolved.error)
      return
    }
    const context: RuntimeGitContext = {
      target: LOCAL_TARGET,
      worktreeId: null,
      worktreePath: repoPath
    }
    inFlight.current = true
    setIsGenerating(true)
    generateRuntimeCommitMessage(context, {
      sourceControlAiResolvedParams: resolved.value.params
    })
      .then((result) => {
        if (result.success) {
          onMessage(result.message)
        } else if (!result.canceled) {
          toast.error(result.error)
        }
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        inFlight.current = false
        setIsGenerating(false)
      })
  }, [onMessage, projectRepo, repoPath])

  const cancel = useCallback((): void => {
    if (inFlight.current) {
      void cancelRuntimeGenerateCommitMessage({
        target: LOCAL_TARGET,
        worktreeId: null,
        worktreePath: repoPath
      })
    }
  }, [repoPath])

  let generateTooltip: string | undefined
  if (isGenerating) {
    generateTooltip = translate(
      'auto.components.right.sidebar.folderSourceControl.generating',
      'Generating commit message…'
    )
  } else if (stagedCount === 0) {
    generateTooltip = translate(
      'auto.components.right.sidebar.folderSourceControl.generateNeedsStaged',
      'Stage at least one file to generate a message.'
    )
  } else if (hasMessage) {
    generateTooltip = translate(
      'auto.components.right.sidebar.folderSourceControl.generateClear',
      'Clear the message to regenerate.'
    )
  }
  return {
    showGenerate,
    isGenerating,
    isGenerateDisabled: isGenerating || busy || stagedCount === 0 || hasMessage,
    generateTooltip,
    generate,
    cancel
  }
}
