import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errMessage } from '@/lib/hooks'
import { ErrorAlert } from '@/components/ErrorAlert'

export function ConfirmTypeNameDialog({
  open,
  onOpenChange,
  title,
  tableName,
  warning,
  confirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  tableName: string
  warning: string
  confirm: () => Promise<void>
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setText('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await confirm()
      onOpenChange(false)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{warning}</DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="grid gap-1.5">
          <Label htmlFor="confirm-table-name">
            Type the table name <span className="font-mono">{tableName}</span> to confirm
          </Label>
          <Input
            id="confirm-table-name"
            value={text}
            autoComplete="off"
            spellCheck={false}
            className="h-8 font-mono"
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={text !== tableName || busy}
            onClick={submit}
          >
            {busy ? 'Working…' : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
