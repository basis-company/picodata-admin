import { RefreshCwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useAsync } from '@/lib/hooks'
import type { DbInfo } from '@/types'

function stateLabel(raw: string | undefined): string {
  if (raw === undefined || raw === '') return '—'
  try {
    const v: unknown = JSON.parse(raw)
    if (Array.isArray(v) && v.length > 0) return String(v[0])
    if (typeof v === 'string') return v
  } catch {
    /* plain string state */
  }
  return raw
}

function YesNo({ value }: { value: boolean | undefined }) {
  return value ? (
    <Badge variant="secondary" className="font-normal">
      yes
    </Badge>
  ) : (
    <span className="text-muted-foreground">no</span>
  )
}

export function InfoView() {
  const q = useAsync(() => api<DbInfo>('GET', '/info'), [])

  if (q.error) {
    return (
      <div className="p-4">
        <ErrorAlert message={q.error} onRetry={q.reload} />
      </div>
    )
  }
  const info = q.data
  if (!info) {
    return <div className="p-4 text-muted-foreground">Loading cluster info…</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-medium tabular-nums">
          Picodata {info.version ?? 'unknown'}
          {info.tables !== undefined && (
            <span className="text-muted-foreground"> · {info.tables} tables</span>
          )}
        </h2>
        <Button size="icon-sm" variant="ghost" className="ml-auto" title="Reload" onClick={q.reload}>
          <RefreshCwIcon />
        </Button>
      </div>

      {info.properties && Object.keys(info.properties).length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">Properties</h3>
          <div className="w-fit min-w-72 rounded-md border">
            <Table>
              <TableBody>
                {Object.entries(info.properties).map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="w-56 px-2 py-1 text-muted-foreground">{k}</TableCell>
                    <TableCell className="data-cell px-2 py-1">{v}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {info.instances && info.instances.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">
            Instances ({info.instances.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2">Name</TableHead>
                  <TableHead className="h-8 px-2">Tier</TableHead>
                  <TableHead className="h-8 px-2">Replicaset</TableHead>
                  <TableHead className="h-8 px-2">State</TableHead>
                  <TableHead className="h-8 px-2">Target</TableHead>
                  <TableHead className="h-8 px-2">Version</TableHead>
                  <TableHead className="h-8 px-2">Failure domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.instances.map((i) => (
                  <TableRow key={i.name}>
                    <TableCell className="px-2 py-1 font-mono">{i.name}</TableCell>
                    <TableCell className="px-2 py-1">{i.tier}</TableCell>
                    <TableCell className="px-2 py-1">{i.replicaset_name}</TableCell>
                    <TableCell className="px-2 py-1">{stateLabel(i.current_state)}</TableCell>
                    <TableCell className="px-2 py-1">{stateLabel(i.target_state)}</TableCell>
                    <TableCell className="data-cell px-2 py-1">{i.picodata_version}</TableCell>
                    <TableCell className="px-2 py-1">{i.failure_domain}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {info.tiers && info.tiers.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">Tiers ({info.tiers.length})</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2">Name</TableHead>
                  <TableHead className="h-8 px-2">Replication factor</TableHead>
                  <TableHead className="h-8 px-2">Bucket count</TableHead>
                  <TableHead className="h-8 px-2">Default</TableHead>
                  <TableHead className="h-8 px-2">Can vote</TableHead>
                  <TableHead className="h-8 px-2">Bootstrapped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.tiers.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="px-2 py-1 font-mono">{t.name}</TableCell>
                    <TableCell className="px-2 py-1 tabular-nums">{t.replication_factor}</TableCell>
                    <TableCell className="px-2 py-1 tabular-nums">{t.bucket_count}</TableCell>
                    <TableCell className="px-2 py-1">
                      <YesNo value={t.is_default} />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <YesNo value={t.can_vote} />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <YesNo value={t.vshard_bootstrapped} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {info.replicasets && info.replicasets.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">
            Replicasets ({info.replicasets.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2">Name</TableHead>
                  <TableHead className="h-8 px-2">Tier</TableHead>
                  <TableHead className="h-8 px-2">Master</TableHead>
                  <TableHead className="h-8 px-2">State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.replicasets.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="px-2 py-1 font-mono">{r.name}</TableCell>
                    <TableCell className="px-2 py-1">{r.tier}</TableCell>
                    <TableCell className="px-2 py-1">{r.current_master_name}</TableCell>
                    <TableCell className="px-2 py-1">{stateLabel(r.state)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {info.buckets && info.buckets.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[13px] font-medium text-muted-foreground">Buckets</h3>
          <div className="w-fit min-w-64 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2">State</TableHead>
                  <TableHead className="h-8 px-2">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.buckets.map((b) => (
                  <TableRow key={b.state}>
                    <TableCell className="px-2 py-1">
                      <Badge variant="outline" className="font-normal">
                        {b.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1 tabular-nums">{b.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  )
}
