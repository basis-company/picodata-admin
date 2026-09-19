import { useCallback, useState, type KeyboardEvent } from 'react'
import { PlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { errMessage } from '@/lib/hooks'
import type { SqlResult } from '@/types'

export function SqlView() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SqlResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    const q = query.trim()
    if (!q || busy) return
    setBusy(true)
    setError(null)
    try {
      setResult(await api<SqlResult>('POST', '/sql', { body: { query: q } }))
    } catch (e) {
      setResult(null)
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }, [query, busy])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      run()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-4">
        <Textarea
          className="min-h-28 font-mono text-[12px]"
          placeholder="SELECT * FROM user LIMIT 10"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" disabled={busy || !query.trim()} onClick={run}>
            <PlayIcon /> Run
          </Button>
          <span className="text-muted-foreground">Ctrl/Cmd+Enter — single statement</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error && <ErrorAlert message={error} />}
        {!error && result && result.columns.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((c) => (
                    <TableHead
                      key={c}
                      className="h-8 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, i) => (
                  <TableRow key={i}>
                    {result.columns.map((c) => (
                      <TableCell key={c} className="px-2 py-1">
                        {row[c] === null ? (
                          <span className="data-cell italic text-muted-foreground">NULL</span>
                        ) : (
                          <span className="data-cell">{row[c]}</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {result.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={result.columns.length} className="py-2 text-muted-foreground">
                      0 rows returned.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {!error && result && result.columns.length === 0 && result.affected !== null && (
          <div className="text-muted-foreground tabular-nums">
            {result.affected} {result.affected === 1 ? 'row' : 'rows'} affected
          </div>
        )}
        {!error && result && result.columns.length === 0 && result.affected === null && (
          <div className="text-muted-foreground">Done.</div>
        )}
      </div>
    </div>
  )
}
