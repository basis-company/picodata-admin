import { useRef, useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon,
  PlusIcon,
  TerminalIcon,
  UnplugIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorAlert } from '@/components/ErrorAlert'
import { InfoView } from '@/components/InfoView'
import { NewTableDialog } from '@/components/NewTableDialog'
import { SqlView } from '@/components/SqlView'
import { TableView } from '@/components/TableView'
import { highlight, layoutVariants } from '@/components/tableBits'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import type { Config, Connection, TableEntry, View } from '@/types'

export function Shell({
  conn,
  config,
  view,
  onView,
  onDisconnect,
}: {
  conn: Connection
  config: Config | null
  view: View
  onView: (v: View) => void
  onDisconnect: () => void
}) {
  const readOnly = !!config?.readOnly
  const tablesQ = useAsync(() => api<TableEntry[]>('GET', '/tables'), [])
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ system: true })
  const [newTableOpen, setNewTableOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const rows = () => [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-table]') ?? [])]

  const focusRow = (el: HTMLElement | null, dir: 1 | -1) => {
    const all = rows()
    const next = all[(el ? all.indexOf(el as HTMLButtonElement) : -dir) + dir]
    if (next) {
      next.focus()
      next.scrollIntoView({ block: 'nearest' })
    } else if (dir === -1) {
      searchRef.current?.focus()
    }
  }

  const needle = search.trim().toLowerCase()
  const variants = layoutVariants(search.trim())
  const tables = tablesQ.data ?? []
  const matches = (t: TableEntry) =>
    variants.length === 0 ||
    variants.some((v) => t.name.toLowerCase().includes(v.toLowerCase()))
  const activeName = view.kind === 'table' ? view.name : null

  // tier null means the system tier (_pico_* spaces)
  const byTier: Record<string, TableEntry[]> = {}
  const systemTables: TableEntry[] = []
  for (const t of tables) {
    if (!matches(t)) continue
    if (t.tier === null) systemTables.push(t)
    else (byTier[t.tier] ??= []).push(t)
  }
  const tiers = Object.keys(byTier).sort()

  const tableRow = (t: TableEntry) => (
    <button
      key={t.name}
      onClick={() => onView({ kind: 'table', name: t.name })}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-accent',
        activeName === t.name && 'bg-accent font-medium',
      )}
      title={t.name}
      data-table={t.name}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          focusRow(e.currentTarget, e.key === 'ArrowDown' ? 1 : -1)
        }
      }}
    >
      <span className="truncate">{highlight(t.name, variants)}</span>
      <Badge
        variant="outline"
        className="shrink-0 px-1 py-0 text-[10px] font-normal text-muted-foreground"
      >
        {t.engine}
      </Badge>
    </button>
  )

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="truncate border-b px-3 py-2 font-medium" title={conn.dsn}>
          {conn.title}
        </div>
        <div className="flex flex-col gap-1 p-2">
          <Button
            size="sm"
            variant="ghost"
            className={cn('justify-start', view.kind === 'info' && 'bg-accent')}
            onClick={() => onView({ kind: 'info' })}
          >
            <InfoIcon /> Info
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn('justify-start', view.kind === 'sql' && 'bg-accent')}
            onClick={() => onView({ kind: 'sql' })}
          >
            <TerminalIcon /> SQL
          </Button>
          {!readOnly && (
            <Button size="sm" variant="ghost" className="justify-start" onClick={() => setNewTableOpen(true)}>
              <PlusIcon /> New table
            </Button>
          )}
          <Input
            ref={searchRef}
            className="mt-1 h-7"
            placeholder="Search tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                const first = rows()[0]
                if (first) {
                  first.focus()
                  first.scrollIntoView({ block: 'nearest' })
                }
              }
            }}
          />
        </div>
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {tablesQ.error && !tablesQ.data ? (
            <ErrorAlert message={tablesQ.error} onRetry={tablesQ.reload} />
          ) : (
            <div className="flex flex-col gap-px">
              {tablesQ.loading && !tablesQ.data && (
                <div className="px-2 py-1 text-muted-foreground">Loading tables…</div>
              )}
              {tiers.map((tier) => (
                <div key={tier}>
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [tier]: !c[tier] }))}
                    className="mt-1 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-muted-foreground hover:text-foreground"
                  >
                    {!collapsed[tier] || needle ? (
                      <ChevronDownIcon className="size-3" />
                    ) : (
                      <ChevronRightIcon className="size-3" />
                    )}
                    {tier} ({byTier[tier].length})
                  </button>
                  {(!collapsed[tier] || needle) && byTier[tier].map(tableRow)}
                </div>
              ))}
              {systemTables.length > 0 && (
                <div>
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, system: !c.system }))}
                    className="mt-1 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-muted-foreground hover:text-foreground"
                  >
                    {!collapsed.system || needle ? (
                      <ChevronDownIcon className="size-3" />
                    ) : (
                      <ChevronRightIcon className="size-3" />
                    )}
                    System ({systemTables.length})
                  </button>
                  {(!collapsed.system || needle) && systemTables.map(tableRow)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t p-2">
          <Button size="sm" variant="outline" className="w-full" onClick={onDisconnect}>
            <UnplugIcon /> Disconnect
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        {view.kind === 'info' && <InfoView />}
        {view.kind === 'sql' && <SqlView />}
        {view.kind === 'table' && (
          <TableView
            key={view.name}
            name={view.name}
            readOnly={readOnly}
            onDropped={() => {
              tablesQ.reload()
              onView({ kind: 'info' })
            }}
          />
        )}
      </main>
      <NewTableDialog
        open={newTableOpen}
        onOpenChange={setNewTableOpen}
        onCreated={(name) => {
          tablesQ.reload()
          onView({ kind: 'table', name })
        }}
      />
    </div>
  )
}
