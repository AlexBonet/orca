import { useId, useLayoutEffect, useState } from 'react'
import { LoaderCircle, Lock } from 'lucide-react'
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
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'

type PlaneConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: () => void
}

export function PlaneConnectDialog({
  open,
  onOpenChange,
  onConnected
}: PlaneConnectDialogProps): React.JSX.Element {
  const connectPlane = useAppStore((s) => s.connectPlane)
  const mountedRef = useMountedRef()
  const slugId = useId()
  const keyId = useId()
  const errorId = useId()
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear the secret before paint on each open so a prior key never flashes.
  useLayoutEffect(() => {
    if (open) {
      setWorkspaceSlug('')
      setApiKey('')
      setConnecting(false)
      setError(null)
    }
  }, [open])

  const canSubmit = Boolean(workspaceSlug.trim() && apiKey.trim()) && !connecting

  const handleConnect = async (): Promise<void> => {
    if (!canSubmit) {
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const result = await connectPlane({
        workspaceSlug: workspaceSlug.trim(),
        apiKey: apiKey.trim()
      })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        setApiKey('')
        onOpenChange(false)
        onConnected?.()
        return
      }
      setError(result.error)
    } catch {
      if (mountedRef.current) {
        setError(translate('plane.connect.failed', 'Connection failed.'))
      }
    } finally {
      if (mountedRef.current) {
        setConnecting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !connecting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate('plane.connect.title', 'Connect Plane')}</DialogTitle>
          <DialogDescription>
            {translate(
              'plane.connect.description',
              'Use your Plane Cloud workspace slug and a personal API key to browse work items.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void handleConnect()
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={slugId}>
                {translate('plane.connect.workspaceSlug', 'Workspace slug')}
              </Label>
              <Input
                id={slugId}
                value={workspaceSlug}
                placeholder={translate('plane.connect.workspaceSlugPlaceholder', 'my-team')}
                autoComplete="off"
                spellCheck={false}
                disabled={connecting}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => setWorkspaceSlug(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {translate(
                  'plane.connect.workspaceSlugHint',
                  'The first part of your Plane URL: app.plane.so/<slug>/'
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={keyId}>{translate('plane.connect.apiKey', 'API key')}</Label>
              <Input
                id={keyId}
                type="password"
                value={apiKey}
                autoComplete="off"
                spellCheck={false}
                disabled={connecting}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
                {translate(
                  'plane.connect.storageHint',
                  'Create it in Plane under Profile settings → Personal access tokens. It is stored encrypted on this device, never inside your repositories.'
                )}
              </p>
            </div>
          </div>
          {error ? (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={connecting}
              onClick={() => onOpenChange(false)}
            >
              {translate('plane.connect.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {connecting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {translate('plane.connect.submit', 'Connect')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
