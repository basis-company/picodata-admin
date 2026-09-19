import { useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTab } from '@/components/DataTab'
import { SchemaTab } from '@/components/SchemaTab'
import { ErrorAlert } from '@/components/ErrorAlert'
import { api } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import type { SpaceInfo } from '@/types'

export function TableView({
  name,
  readOnly,
  onDropped,
}: {
  name: string
  readOnly: boolean
  onDropped: () => void
}) {
  const q = useAsync(() => api<SpaceInfo>('GET', `/tables/${encodeURIComponent(name)}`), [name])
  const [tab, setTab] = useState('data')
  const space = q.data

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <span className="font-medium">{space ? space.name : name}</span>
        {space && (
          <>
            <Badge variant="secondary">{space.engine}</Badge>
            {space.global ? (
              <Badge variant="outline">global</Badge>
            ) : (
              <Badge variant="outline">sharded by [{space.distributed.join(', ')}]</Badge>
            )}
            {space.tier && <Badge variant="outline">{space.tier}</Badge>}
            <span className="text-muted-foreground tabular-nums">
              {space.rows === null ? 'row count unavailable' : `${space.rows.toLocaleString()} rows`}
            </span>
          </>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          className="ml-auto"
          title="Reload table"
          onClick={q.reload}
        >
          <RefreshCwIcon />
        </Button>
      </div>
      {q.error && (
        <div className="px-4 pt-3">
          <ErrorAlert message={q.error} onRetry={q.reload} />
        </div>
      )}
      {!space && !q.error && (
        <div className="p-4 text-muted-foreground">Loading table…</div>
      )}
      {space && (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="mx-4 mt-2 h-8">
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="mt-0 min-h-0 flex-1">
            <DataTab space={space} readOnly={readOnly} onChanged={q.reload} />
          </TabsContent>
          <TabsContent value="schema" className="mt-0 min-h-0 flex-1 overflow-auto">
            <SchemaTab space={space} readOnly={readOnly} onChanged={q.reload} onDropped={onDropped} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
