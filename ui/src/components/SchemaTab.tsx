import { useEffect, useState } from 'react'
import { CheckIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COLUMN_TYPES } from '@/components/NewTableDialog'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { StickyHead, Th } from '@/components/tableBits'
import { ConfirmTypeNameDialog } from '@/components/ConfirmTypeNameDialog'
import { ErrorAlert } from '@/components/ErrorAlert'
import { api } from '@/lib/api'
import { errMessage } from '@/lib/hooks'
import type { Ok, SpaceInfo } from '@/types'

export function SchemaTab({
  space,
  readOnly,
  onChanged,
  onDropped,
}: {
  space: SpaceInfo
  readOnly: boolean
  onChanged: () => void
  onDropped: () => void
}) {
  const [indexOpen, setIndexOpen] = useState(false)
  const [columnOpen, setColumnOpen] = useState(false)
  const [truncateOpen, setTruncateOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const dropIndex = async (index: string) => {
    try {
      await api<Ok>('DELETE', `/indexes/${encodeURIComponent(index)}`)
      setError(null)
      onChanged()
    } catch (e) {
      setError(errMessage(e))
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="font-medium">{space.name}</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onChanged}>
          <RefreshCwIcon /> Refresh
        </Button>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setColumnOpen(true)}>
            <PlusIcon /> Add column
          </Button>
        )}
      </div>
      <div className="space-y-6 px-4 pb-4 pt-4">
      {error && <ErrorAlert message={error} />}
      <section className="space-y-2">
        <div className="panel overflow-hidden">
          <Table>
            <StickyHead>
              <TableRow>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Flags</Th>
                <Th>Default</Th>
              </TableRow>
            </StickyHead>
            <TableBody>
              {space.columns.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="px-2 py-1 font-mono">{c.name}</TableCell>
                  <TableCell className="px-2 py-1 font-mono">{c.type}</TableCell>
                  <TableCell className="px-2 py-1">
                    <div className="flex gap-1">
                      {c.primary && <Badge variant="secondary">pk</Badge>}
                      {c.nullable && <Badge variant="outline">nullable</Badge>}
                      {c.unsigned && <Badge variant="outline">unsigned</Badge>}
                      {c.array && <Badge variant="outline">array</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="data-cell px-2 py-1 text-muted-foreground">
                    {c.default === undefined || c.default === null ? '—' : JSON.stringify(c.default)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      {columnOpen && (
        <AddColumnDialog
          space={space}
          open
          onOpenChange={(o) => !o && setColumnOpen(false)}
          onDone={() => {
            setError(null)
            onChanged()
          }}
        />
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground">Indexes</h3>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setIndexOpen(true)}>
              <PlusIcon /> Add index
            </Button>
          )}
        </div>
        <div className="panel overflow-hidden">
          <Table>
            <StickyHead>
              <TableRow>
                <Th>Name</Th>
                <Th>Columns</Th>
                <Th>Using</Th>
                <Th>Unique</Th>
                {!readOnly && <Th className="h-8 w-9 px-1" />}
              </TableRow>
            </StickyHead>
            <TableBody>
              {space.indexes.map((i) => (
                <TableRow key={i.name}>
                  <TableCell className="px-2 py-1 font-mono">{i.name}</TableCell>
                  <TableCell className="px-2 py-1 font-mono">[{i.columns.join(', ')}]</TableCell>
                  <TableCell className="px-2 py-1">{i.using}</TableCell>
                  <TableCell className="px-2 py-1">
                    {i.unique ? (
                      <CheckIcon className="size-3.5 text-green-600" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="px-1 py-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        title="Drop index"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => dropIndex(i.name)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {space.indexes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={readOnly ? 4 : 5} className="py-2 text-muted-foreground">
                    No indexes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {!readOnly && (
        <section className="panel border-destructive/40">
          <div className="border-b bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive">
            Danger zone
          </div>
          <div className="flex items-center gap-2 p-3">
            <Button size="sm" variant="outline" onClick={() => setTruncateOpen(true)}>
              Truncate table
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDropOpen(true)}>
              Drop table
            </Button>
          </div>
        </section>
      )}
      </div>

      <AddIndexDialog
        space={space}
        open={indexOpen}
        onOpenChange={setIndexOpen}
        onDone={onChanged}
      />
      <ConfirmTypeNameDialog
        open={truncateOpen}
        onOpenChange={setTruncateOpen}
        title="Truncate table"
        tableName={space.name}
        warning={`All rows in ${space.name} will be deleted. This cannot be undone.`}
        confirm={async () => {
          await api('POST', `/tables/${encodeURIComponent(space.name)}/truncate`)
          onChanged()
        }}
      />
      <ConfirmTypeNameDialog
        open={dropOpen}
        onOpenChange={setDropOpen}
        title="Drop table"
        tableName={space.name}
        warning={`Table ${space.name} and all its data will be destroyed. This cannot be undone.`}
        confirm={async () => {
          await api<Ok>('DELETE', `/tables/${encodeURIComponent(space.name)}`)
          onDropped()
        }}
      />
    </div>
  )
}

function AddIndexDialog({
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
  const [name, setName] = useState('')
  const [columns, setColumns] = useState<string[]>([])
  const [unique, setUnique] = useState(false)
  const using = 'TREE'
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setColumns([])
      setUnique(false)
      setError(null)
      setBusy(false)
    }
  }, [open])

  const toggle = (column: string) =>
    setColumns((cs) => (cs.includes(column) ? cs.filter((c) => c !== column) : [...cs, column]))

  const submit = async () => {
    if (columns.length === 0) {
      setError('Select at least one column.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api<Ok>('POST', `/tables/${encodeURIComponent(space.name)}/indexes`, {
        body: { name: name.trim() || null, columns, unique, using },
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add index to {space.name}</DialogTitle>
          <DialogDescription>Leave the name empty to generate one automatically.</DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="index-name">Name (optional)</Label>
            <Input
              id="index-name"
              className="h-8"
              placeholder={`${space.name}_…_idx`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Using</Label>
            <div className="flex h-8 items-center rounded-md border px-2 text-muted-foreground">
              TREE
            </div>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch id="index-unique" checked={unique} onCheckedChange={setUnique} />
            <Label htmlFor="index-unique">Unique</Label>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Columns</Label>
          <div className="max-h-48 overflow-y-auto rounded-md border p-2">
            {space.columns.map((c) => (
              <label
                key={c.name}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent"
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={columns.includes(c.name)}
                  onChange={() => toggle(c.name)}
                />
                <span className="font-mono">{c.name}</span>
                <span className="text-muted-foreground">{c.type}</span>
                {c.primary && <Badge variant="secondary">pk</Badge>}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            {busy ? 'Creating…' : 'Create index'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddColumnDialog({
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
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('TEXT')
  const [nullable, setNullable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setType('TEXT')
      setNullable(true)
      setError(null)
      setBusy(false)
    }
  }, [open])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api<Ok>('POST', `/tables/${encodeURIComponent(space.name)}/columns`, {
        body: { name: name.trim(), type, nullable },
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add column to {space.name}</DialogTitle>
          <DialogDescription>
            Existing rows get NULL in the new column. NOT NULL fails on non-empty tables.
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="column-name">Name</Label>
            <Input
              id="column-name"
              className="h-8"
              placeholder="columnName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch id="column-nullable" checked={nullable} onCheckedChange={setNullable} />
            <Label htmlFor="column-nullable">Nullable</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy || !name.trim()} onClick={submit}>
            {busy ? 'Adding…' : 'Add column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
