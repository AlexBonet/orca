import { realpath } from 'node:fs/promises'
import { normalizeRuntimePathForComparison } from '../../shared/cross-platform-path'

async function comparablePath(path: string): Promise<string> {
  try {
    return normalizeRuntimePathForComparison(await realpath(path))
  } catch {
    return normalizeRuntimePathForComparison(path)
  }
}

export async function isStrictSubfolderOfGitRoot(path: string, rootPath: string): Promise<boolean> {
  const [pathKey, rootKey] = await Promise.all([comparablePath(path), comparablePath(rootPath)])
  return pathKey !== rootKey
}
