import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
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

const SQL_KEYWORDS = new Set([
  'select', 'insert', 'into', 'values', 'update', 'set', 'delete', 'from', 'where', 'and', 'or',
  'not', 'null', 'is', 'in', 'like', 'ilike', 'between', 'join', 'left', 'right', 'inner', 'outer',
  'full', 'cross', 'natural', 'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'asc',
  'desc', 'distinct', 'as', 'create', 'table', 'index', 'drop', 'alter', 'add', 'column', 'primary',
  'key', 'unique', 'foreign', 'references', 'if', 'exists', 'cascade', 'default', 'integer', 'bigint',
  'double', 'varchar', 'text', 'boolean', 'json', 'jsonb', 'uuid', 'true', 'false', 'union', 'all',
  'except', 'intersect', 'with', 'cast', 'count', 'sum', 'min', 'max', 'avg', 'vac', 'analyze',
  'show', 'commit', 'transaction', 'begin', 'using',
])

function highlightSql(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /(--[^\n]*)|('(?:[^']|'')*'|"(?:[^"]|"")*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const key = k++
    if (m[1]) parts.push(<span key={key} className="italic text-muted-foreground">{m[1]}</span>)
    else if (m[2]) parts.push(<span key={key} className="text-amber-700">{m[2]}</span>)
    else if (m[3]) parts.push(<span key={key} className="text-violet-600">{m[3]}</span>)
    else if (SQL_KEYWORDS.has(m[4].toLowerCase()))
      parts.push(<span key={key} className="font-semibold text-sky-600">{m[4]}</span>)
    else parts.push(<span key={key}>{m[4]}</span>)
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return parts
}

export function SqlView() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SqlResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const hlRef = useRef<HTMLDivElement>(null)

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
      <div className="flex h-[52px] shrink-0 items-center border-b px-4">
        <span className="translate-y-px font-medium">Distributed SQL</span>
      </div>
      <div className="border-b px-4 pb-4 pt-4">
        <div className="relative">
          <div
            ref={hlRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2 font-mono text-[12px] leading-[20px] whitespace-pre-wrap break-words text-foreground"
          >
            {highlightSql(query)}
          </div>
          <Textarea
            className="min-h-28 bg-transparent font-mono text-[12px] leading-[20px] text-transparent caret-foreground selection:bg-primary/20 md:text-[12px]"
            placeholder="SELECT * FROM user LIMIT 10"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={(e) => {
              if (hlRef.current) hlRef.current.scrollTop = e.currentTarget.scrollTop
            }}
          />
        </div>
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
          <div className="panel overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
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
                          <span className="data-cell italic text-muted-foreground">—</span>
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
