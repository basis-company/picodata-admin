import { useEffect, useState } from 'react'
import { DatabaseIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
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
import { ErrorAlert } from '@/components/ErrorAlert'
import {
  buildDsn,
  loadSaved,
  maskDsn,
  parseDsn,
  saveSaved,
  type SavedConnection,
} from '@/lib/connections'
import type { Config, Connection } from '@/types'

type Row = SavedConnection & { env: boolean }

export function HomeView({
  config,
  error,
  onReload,
  onConnect,
}: {
  config: Config | null
  error: string | null
  onReload: () => void
  onConnect: (c: Connection) => void
}) {
  const [saved, setSaved] = useState<SavedConnection[]>(loadSaved)
  const [editing, setEditing] = useState<SavedConnection | 'new' | null>(null)
  const editorHidden = !!config?.connectionsReadOnly
  // with connectionsReadOnly only env-provided connections are usable
  const rows: Row[] = [
    ...(config?.connections ?? []).map((c) => ({
      id: `env:${c.dsn}`,
      title: c.title,
      dsn: c.dsn,
      env: true,
    })),
    ...(editorHidden ? [] : saved.map((c) => ({ ...c, env: false }))),
  ]

  const upsert = (c: SavedConnection) => {
    const next = saved.some((p) => p.id === c.id)
      ? saved.map((p) => (p.id === c.id ? c : p))
      : [...saved, c]
    saveSaved(next)
    setSaved(next)
  }

  const remove = (id: string) => {
    const next = saved.filter((p) => p.id !== id)
    saveSaved(next)
    setSaved(next)
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-6">
      <div className="mx-auto w-full max-w-[500px]">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-sm font-semibold">Picodata Admin</h1>
        {config && config.version.sha && config.version.sha !== 'unknown' && (
          <span className="text-muted-foreground">
            {config.version.tag && config.version.tag !== 'unknown' ? `v${config.version.tag} ` : ''}
            ({config.version.short_sha})
            {config.latest && ` — update available: ${config.latest}`}
          </span>
        )}
      </div>
      {error && (
        <div className="mb-4">
          <ErrorAlert message={`Could not load server configuration: ${error}`} onRetry={onReload} />
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground">Connections</h2>
        {!editorHidden && (
          <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
            <PlusIcon /> Add connection
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="panel px-3 py-6 text-center text-muted-foreground">
          No connections. Add one to get started.
        </div>
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((c) => (
            <div
              key={c.id}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent"
              onClick={() => onConnect(c)}
              title={`Connect to ${c.title}`}
            >
              <DatabaseIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.title}</div>
                <div className="data-cell truncate text-muted-foreground">{maskDsn(c.dsn)}</div>
              </div>
              {c.env && <Badge variant="secondary">env</Badge>}
              <Button size="sm" onClick={() => onConnect(c)}>
                Connect
              </Button>
              {!c.env && !editorHidden && (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Edit connection"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing({ id: c.id, title: c.title, dsn: c.dsn })
                    }}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Delete connection"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(c.id)
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {editorHidden && (
        <p className="mt-3 text-muted-foreground">
          Connections are managed by the server configuration.
        </p>
      )}
      {editing && (
        <ConnectionDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing === 'new' ? null : editing}
          onSave={upsert}
        />
      )}
      </div>
    </div>
  )
}

function ConnectionDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: SavedConnection | null
  onSave: (c: SavedConnection) => void
}) {
  const [title, setTitle] = useState(initial ? initial.title : '')
  const [host, setHost] = useState(() => (initial ? parseDsn(initial.dsn).host : 'localhost'))
  const [port, setPort] = useState(() => (initial ? parseDsn(initial.dsn).port : ''))
  const [user, setUser] = useState(() => (initial ? parseDsn(initial.dsn).user : ''))
  const [pass, setPass] = useState(() => (initial ? parseDsn(initial.dsn).pass : ''))
  const [dbname, setDbname] = useState(() => (initial ? parseDsn(initial.dsn).dbname : ''))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const p = initial ? parseDsn(initial.dsn) : { host: 'localhost', port: '', user: '', pass: '', dbname: '' }
    setTitle(initial ? initial.title : '')
    setHost(p.host)
    setPort(p.port)
    setUser(p.user)
    setPass(p.pass)
    setDbname(p.dbname)
    setError(null)
  }, [open, initial])

  const submit = () => {
    if (!host.trim()) {
      setError('Host is required.')
      return
    }
    const parts = {
      host: host.trim(),
      port: port.trim(),
      user: user.trim(),
      pass,
      dbname: dbname.trim(),
    }
    const dsn = buildDsn(parts)
    const fallback = `${parts.host}${parts.port ? ':' + parts.port : ''}${parts.dbname ? '/' + parts.dbname : ''}`
    onSave({
      id: initial ? initial.id : crypto.randomUUID(),
      title: title.trim() || fallback,
      dsn,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit connection' : 'New connection'}</DialogTitle>
          <DialogDescription>
            Builds a DSN like{' '}
            <span className="font-mono">postgresql://user:pass@host:5432/dbname</span>.
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorAlert message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="conn-title">Title</Label>
            <Input
              id="conn-title"
              className="h-8"
              placeholder="picodata-1-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="conn-host">Host</Label>
            <Input id="conn-host" className="h-8" value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="conn-port">Port</Label>
            <Input
              id="conn-port"
              className="h-8"
              placeholder="5432"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="conn-user">User</Label>
            <Input id="conn-user" className="h-8" value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="conn-pass">Password</Label>
            <Input
              id="conn-pass"
              type="password"
              className="h-8"
              autoComplete="new-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <div className="col-span-2 grid gap-1.5">
            <Label htmlFor="conn-db">Database (optional)</Label>
            <Input id="conn-db" className="h-8" value={dbname} onChange={(e) => setDbname(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
