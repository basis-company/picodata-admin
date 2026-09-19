import { CheckIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { StickyHead, Th } from '@/components/tableBits'
import { DotBadge } from '@/components/DotBadge'
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

function stateTone(label: string): 'good' | 'bad' | 'neutral' {
  if (/online|ready|active|running/i.test(label)) return 'good'
  if (/fail|error|down|unavailable|dropped|orphan/i.test(label)) return 'bad'
  return 'neutral'
}

function StateCell({ raw }: { raw: string | undefined }) {
  const label = stateLabel(raw)
  if (label === '—') return <span className="text-muted-foreground">—</span>
  return <DotBadge tone={stateTone(label)}>{label}</DotBadge>
}

function YesNo({ value }: { value: boolean | undefined }) {
  return value ? (
    <CheckIcon className="size-3.5 text-green-600" />
  ) : (
    <span className="text-muted-foreground">—</span>
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
    <div className="w-full space-y-6 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium tabular-nums">
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
          <h3 className="text-xs font-medium text-muted-foreground">Properties</h3>
          <div className="panel overflow-hidden">
            <Table>
              <TableBody>
                {Object.entries(info.properties).map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="w-64 px-2 py-1 text-muted-foreground">{k}</TableCell>
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
          <h3 className="text-xs font-medium text-muted-foreground">
            Instances ({info.instances.length})
          </h3>
          <div className="panel overflow-hidden">
            <Table>
              <StickyHead>
                <TableRow>
                  <Th>Name</Th>
                  <Th>Tier</Th>
                  <Th>Replicaset</Th>
                  <Th>State</Th>
                  <Th>Target</Th>
                  <Th>Version</Th>
                  <Th>Failure domain</Th>
                </TableRow>
              </StickyHead>
              <TableBody>
                {info.instances.map((i) => (
                  <TableRow key={i.name}>
                    <TableCell className="px-2 py-1">{i.name}</TableCell>
                    <TableCell className="px-2 py-1">{i.tier}</TableCell>
                    <TableCell className="px-2 py-1">{i.replicaset_name}</TableCell>
                    <TableCell className="px-2 py-1">
                      <StateCell raw={i.current_state} />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <StateCell raw={i.target_state} />
                    </TableCell>
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
          <h3 className="text-xs font-medium text-muted-foreground">Tiers ({info.tiers.length})</h3>
          <div className="panel overflow-hidden">
            <Table>
              <StickyHead>
                <TableRow>
                  <Th>Name</Th>
                  <Th className="text-right">Replication factor</Th>
                  <Th className="text-right">Bucket count</Th>
                  <Th>Default</Th>
                  <Th>Can vote</Th>
                  <Th>Bootstrapped</Th>
                </TableRow>
              </StickyHead>
              <TableBody>
                {info.tiers.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="px-2 py-1">{t.name}</TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">
                      {t.replication_factor}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">
                      {t.bucket_count}
                    </TableCell>
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
          <h3 className="text-xs font-medium text-muted-foreground">
            Replicasets ({info.replicasets.length})
          </h3>
          <div className="panel overflow-hidden">
            <Table>
              <StickyHead>
                <TableRow>
                  <Th>Name</Th>
                  <Th>Tier</Th>
                  <Th>Master</Th>
                  <Th>State</Th>
                </TableRow>
              </StickyHead>
              <TableBody>
                {info.replicasets.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="px-2 py-1">{r.name}</TableCell>
                    <TableCell className="px-2 py-1">{r.tier}</TableCell>
                    <TableCell className="px-2 py-1">{r.current_master_name}</TableCell>
                    <TableCell className="px-2 py-1">
                      <StateCell raw={r.state} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {info.buckets && info.buckets.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Buckets</h3>
          <div className="panel overflow-hidden">
            <Table>
              <StickyHead>
                <TableRow>
                  <Th>State</Th>
                  <Th className="text-right">Count</Th>
                </TableRow>
              </StickyHead>
              <TableBody>
                {info.buckets.map((b) => (
                  <TableRow key={b.state}>
                    <TableCell className="px-2 py-1">
                      <DotBadge tone={stateTone(b.state)}>{b.state}</DotBadge>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">{b.count}</TableCell>
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
