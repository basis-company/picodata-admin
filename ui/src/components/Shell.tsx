import { useState } from 'react'
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
  const [systemOpen, setSystemOpen] = useState(false)
  const [newTableOpen, setNewTableOpen] = useState(false)

  const needle = search.trim().toLowerCase()
  const tables = tablesQ.data ?? []
  const isSystem = (t: TableEntry) => t.name.startsWith('_pico_')
  const matches = (t: TableEntry) => !needle || t.name.toLowerCase().includes(needle)
  const userTables = tables.filter((t) => !isSystem(t) && matches(t))
  const systemTables = tables.filter((t) => isSystem(t) && matches(t))
  const activeName = view.kind === 'table' ? view.name : null
  const systemExpanded = systemOpen || !!needle

  const tableRow = (t: TableEntry) => (
    <button
      key={t.name}
      onClick={() => onView({ kind: 'table', name: t.name })}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-accent',
        activeName === t.name && 'bg-accent font-medium',
      )}
      title={t.name}
    >
      <span className="truncate">{t.name}</span>
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
      <aside className="flex w-60 shrink-0 flex-col border-r">
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
            className="mt-1 h-7"
            placeholder="Search tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {tablesQ.error && !tablesQ.data ? (
            <ErrorAlert message={tablesQ.error} onRetry={tablesQ.reload} />
          ) : (
            <div className="flex flex-col gap-px">
              {tablesQ.loading && !tablesQ.data && (
                <div className="px-2 py-1 text-muted-foreground">Loading tables…</div>
              )}
              {userTables.map(tableRow)}
              {systemTables.length > 0 && (
                <>
                  <button
                    onClick={() => setSystemOpen((o) => !o)}
                    className="mt-1 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-muted-foreground hover:text-foreground"
                  >
                    {systemExpanded ? (
                      <ChevronDownIcon className="size-3" />
                    ) : (
                      <ChevronRightIcon className="size-3" />
                    )}
                    System ({systemTables.length})
                  </button>
                  {systemExpanded && systemTables.map(tableRow)}
                </>
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
