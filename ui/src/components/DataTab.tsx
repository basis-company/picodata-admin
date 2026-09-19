import { useEffect, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
  PencilIcon,
} from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ErrorAlert } from '@/components/ErrorAlert'
import { api } from '@/lib/api'
import { errMessage, useAsync } from '@/lib/hooks'
import type { Affected, Cell, RowsPage, SpaceInfo } from '@/types'

const PAGE_SIZES = ['25', '50', '100', '250']

export function DataTab({
  space,
  readOnly,
  onChanged,
}: {
  space: SpaceInfo
  readOnly: boolean
  onChanged: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<Record<string, Cell> | null>(null)
  const rowsPath = `/tables/${encodeURIComponent(space.name)}/rows`
  const q = useAsync(
    () => api<RowsPage>('GET', `${rowsPath}?offset=${offset}&limit=${limit}`),
    [space.name, offset, limit],
  )
  const rows = q.data?.rows ?? []
  const total = q.data?.total ?? null
  const columns =
    q.data?.columns && q.data.columns.length > 0
      ? q.data.columns
      : rows.length > 0
        ? Object.keys(rows[0])
        : space.columns.map((c) => c.name)
  const rangeEnd = total !== null ? Math.min(offset + limit, total) : offset + rows.length
  const hasNext = total !== null ? offset + limit < total : rows.length === limit

  const changed = () => {
    q.reload()
    onChanged()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <PlusIcon /> Add row
          </Button>
        )}
        {q.error && (
          <div className="min-w-0 flex-1">
            <ErrorAlert message={q.error} onRetry={q.reload} />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!q.loading && rows.length === 0 && !q.error && (
          <div className="panel px-4 py-6 text-center text-muted-foreground">No rows.</div>
        )}
        {rows.length > 0 && (
          <div className="panel overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className="h-8 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {c}
                  </TableHead>
                ))}
                {!readOnly && <TableHead className="h-8 w-9 px-1" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c} className="px-2 py-1">
                      {row[c] === null ? (
                        <span className="data-cell italic text-muted-foreground">—</span>
                      ) : (
                        <span className="data-cell">{row[c]}</span>
                      )}
                    </TableCell>
                  ))}
                  {!readOnly && (
                    <TableCell className="px-1 py-1">
                      <Button size="icon-xs" variant="ghost" title="Edit row" onClick={() => setEditRow(row)}>
                        <PencilIcon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t px-4 py-1.5 text-muted-foreground">
        <span className="tabular-nums">
          {rows.length === 0 ? 'no rows' : `${offset + 1}–${rangeEnd} of ${total === null ? '?' : total.toLocaleString()}`}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v))
              setOffset(0)
            }}
          >
            <SelectTrigger size="sm" className="w-[72px]" title="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon-sm"
            variant="outline"
            title="Previous page"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            title="Next page"
            disabled={!hasNext}
            onClick={() => setOffset(offset + limit)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <AddRowDialog
        space={space}
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={changed}
      />
      {editRow && (
        <EditRowDialog
          space={space}
          row={editRow}
          open
          onOpenChange={(o) => !o && setEditRow(null)}
          onDone={changed}
        />
      )}
    </div>
  )
}

function initialValues(space: SpaceInfo, row?: Record<string, Cell>) {
  return Object.fromEntries(
    space.columns.map((c) => [c.name, (row ? row[c.name] : undefined) ?? '']),
  ) as Record<string, string>
}

function valuesPayload(space: SpaceInfo, values: Record<string, string>) {
  const out: Record<string, string | null> = {}
  for (const c of space.columns) {
    const v = values[c.name] ?? ''
    out[c.name] = v === '' ? null : v
  }
  return out
}

function ColumnInputs({
  space,
  values,
  disabledColumns,
  onChange,
}: {
  space: SpaceInfo
  values: Record<string, string>
  disabledColumns: string[]
  onChange: (name: string, value: string) => void
}) {
  return (
    <div className="grid gap-2">
      {space.columns.map((c) => {
        const disabled = disabledColumns.includes(c.name)
        return (
          <div key={c.name} className="grid grid-cols-[140px_1fr] items-center gap-2">
            <Label htmlFor={`cell-${c.name}`} className="justify-self-start font-mono">
              {c.name}
              {c.nullable && <span className="ml-1 font-sans text-muted-foreground">?</span>}
            </Label>
            <Input
              id={`cell-${c.name}`}
              className="h-8 font-mono"
              disabled={disabled}
              value={values[c.name] ?? ''}
              onChange={(e) => onChange(c.name, e.target.value)}
            />
          </div>
        )
      })}
    </div>
  )
}

function AddRowDialog({
  space,
  open,
  onOpenChange,
  onDone,
}: {
  space: SpaceInfo
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(initialValues(space))
      setError(null)
      setBusy(false)
    }
  }, [open, space])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api<Affected>('POST', `/tables/${encodeURIComponent(space.name)}/rows`, {
        body: { values: valuesPayload(space, values) },
      })
      onDone()
      onOpenChange(false)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New row in {space.name}</DialogTitle>
          <DialogDescription>Empty fields are inserted as NULL.</DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="max-h-[60vh] overflow-y-auto">
          <ColumnInputs
            space={space}
            values={values}
            disabledColumns={[]}
            onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            {busy ? 'Inserting…' : 'Insert row'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditRowDialog({
  space,
  row,
  open,
  onOpenChange,
  onDone,
}: {
  space: SpaceInfo
  row: Record<string, Cell>
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(space, row))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [armedDelete, setArmedDelete] = useState(false)
  const key = Object.fromEntries(space.primary.map((p) => [p, row[p] ?? null])) as Record<string, string | null>
  const rowsPath = `/tables/${encodeURIComponent(space.name)}/rows`

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone()
      onOpenChange(false)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = () =>
    run(() => {
      const payload = valuesPayload(space, values)
      for (const p of space.primary) delete payload[p]
      return api<Affected>('PATCH', rowsPath, { body: { key, values: payload } })
    })

  const removeRow = () =>
    run(() => api<Affected>('DELETE', rowsPath, { body: { key } }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit row in {space.name}</DialogTitle>
          <DialogDescription>
            Primary key ({space.primary.join(', ')}) is fixed; empty fields become NULL.
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="max-h-[60vh] overflow-y-auto">
          <ColumnInputs
            space={space}
            values={values}
            disabledColumns={space.primary}
            onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
          />
        </div>
        <DialogFooter className="items-center gap-2 sm:justify-between">
          {!armedDelete ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setArmedDelete(true)}
            >
              <Trash2Icon /> Delete row
            </Button>
          ) : (
            <Button size="sm" variant="destructive" disabled={busy} onClick={removeRow}>
              Confirm delete
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={submit}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
