import { AlertCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorAlert({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
    >
      <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0 flex-1 break-words whitespace-pre-wrap">{message}</div>
      {onRetry && (
        <Button size="xs" variant="outline" className="shrink-0" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
