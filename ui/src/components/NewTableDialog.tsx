import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { ErrorAlert } from '@/components/ErrorAlert'
import { api } from '@/lib/api'
import { errMessage } from '@/lib/hooks'

const COLUMN_TYPES = [
  'INTEGER',
  'DOUBLE',
  'TEXT',
  'BOOLEAN',
  'DATETIME',
  'UUID',
  'DECIMAL',
  'JSON',
] as const

type ColumnDraft = {
  name: string
  type: string
  nullable: boolean
  primary: boolean
}

type Created = { sql: string[] }

export function NewTableDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (name: string) => void
}) {
  const [name, setName] = useState('')
  const [engine, setEngine] = useState('memtx')
  const [global, setGlobal] = useState(false)
  const [tier, setTier] = useState('default')
  const [columns, setColumns] = useState<ColumnDraft[]>([
    { name: 'id', type: 'INTEGER', nullable: false, primary: true },
  ])
  const [distributed, setDistributed] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setEngine('memtx')
      setGlobal(false)
      setTier('default')
      setColumns([{ name: 'id', type: 'INTEGER', nullable: false, primary: true }])
      setDistributed('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  const patchColumn = (index: number, patch: Partial<ColumnDraft>) =>
    setColumns((cs) => cs.map((c, i) => (i === index ? { ...c, ...patch } : c)))

  const named = columns.filter((c) => c.name.trim() !== '')
  const distributedOptions = [
    ...named.filter((c) => c.primary),
    ...named.filter((c) => !c.primary),
  ]

  const submit = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Table name is required.')
      return
    }
    if (named.length === 0) {
      setError('At least one named column is required.')
      return
    }
    if (!named.some((c) => c.primary)) {
      setError('At least one primary key column is required.')
      return
    }
    const lower = named.map((c) => c.name.trim().toLowerCase())
    if (lower.some((n, i) => lower.indexOf(n) !== i)) {
      setError('Column names must be unique.')
      return
    }
    if (!global && distributed && !named.some((c) => c.name.trim() === distributed)) {
      setError('Distribution key column is not in the column list.')
      return
    }
    const distribution = global
      ? []
      : distributed
        ? [distributed]
        : [named.find((c) => c.primary)!.name.trim()]
    const body = {
      name: name.trim(),
      engine,
      global,
      distributed: distribution,
      tier: tier.trim() || null,
      columns: named.map((c) => ({
        name: c.name.trim(),
        type: c.type,
        nullable: c.nullable,
        primary: c.primary,
      })),
      indexes: [],
    }
    setBusy(true)
    try {
      await api<Created>('POST', '/tables', { body })
      onCreated(name.trim())
      onOpenChange(false)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New table</DialogTitle>
          <DialogDescription>Creates a Picodata space with its columns and primary key.</DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="nt-name">Name</Label>
            <Input
              id="nt-name"
              className="h-8"
              placeholder="orders"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nt-engine">Engine</Label>
            <Select value={engine} onValueChange={setEngine}>
              <SelectTrigger id="nt-engine" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="memtx">memtx</SelectItem>
                <SelectItem value="vinyl">vinyl</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nt-tier">Tier</Label>
            <Input
              id="nt-tier"
              className="h-8"
              placeholder="default"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch id="nt-global" checked={global} onCheckedChange={setGlobal} />
            <Label htmlFor="nt-global">Global table</Label>
          </div>
          {!global && (
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="nt-distributed">Distribution key (sharded tables)</Label>
              <Select value={distributed} onValueChange={setDistributed}>
                <SelectTrigger id="nt-distributed" className="h-8">
                  <SelectValue placeholder="Defaults to the first primary key column" />
                </SelectTrigger>
                <SelectContent>
                  {distributedOptions.map((c) => (
                    <SelectItem key={c.name.trim()} value={c.name.trim()}>
                      {c.name.trim()}
                      <span className="text-muted-foreground">
                        {' '}
                        ({c.primary ? 'pk' : 'column'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label>Columns</Label>
          <div className="flex flex-col gap-1.5">
            {columns.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_130px_56px_48px_28px] items-center gap-2">
                <Input
                  className="h-8 font-mono"
                  placeholder="name"
                  spellCheck={false}
                  value={c.name}
                  onChange={(e) => patchColumn(i, { name: e.target.value })}
                />
                <Select value={c.type} onValueChange={(v) => patchColumn(i, { type: v })}>
                  <SelectTrigger className="h-8">
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
                <label className="flex items-center gap-1 text-muted-foreground" title="Nullable">
                  <Switch
                    size="sm"
                    checked={c.nullable}
                    onCheckedChange={(v) => patchColumn(i, { nullable: v })}
                  />
                  null
                </label>
                <label className="flex items-center gap-1 text-muted-foreground" title="Primary key">
                  <Switch
                    size="sm"
                    checked={c.primary}
                    onCheckedChange={(v) => patchColumn(i, { primary: v })}
                  />
                  pk
                </label>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  title="Remove column"
                  disabled={columns.length === 1}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setColumns((cs) => cs.filter((_, j) => j !== i))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() =>
              setColumns((cs) => [...cs, { name: '', type: 'TEXT', nullable: true, primary: false }])
            }
          >
            <PlusIcon /> Add column
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={submit}>
            {busy ? 'Creating…' : 'Create table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
