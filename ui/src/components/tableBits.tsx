import type { ComponentProps, ReactNode } from 'react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function Th({ className, ...props }: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        'h-8 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function StickyHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('sticky top-0 z-10 border-b bg-muted', className)} {...props} />
}

const CYR = 'йцукенгшщзхъё' + 'фывапролджэ' + 'ячсмитьбю'
const LAT = 'qwertyuiop[]`' + 'asdfghjkl;\'' + 'zxcvbnm,.'

/** a term typed on the wrong keyboard layout, e.g. "шеу" ⇄ "ite" */
export function layoutVariants(term: string): string[] {
  if (!term) return []
  const swap = (from: string, to: string) =>
    [...term]
      .map((ch) => {
        const i = from.indexOf(ch.toLowerCase())
        if (i < 0) return ch
        const m = to[i]
        return ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? m.toUpperCase() : m
      })
      .join('')
  return [...new Set([term, swap(CYR, LAT), swap(LAT, CYR)])]
}

export function highlight(text: string, terms: string | string[]): ReactNode {
  const needles = [...new Set((Array.isArray(terms) ? terms : [terms]).map((t) => t.toLowerCase()))].filter(
    (t) => t !== '',
  )
  if (needles.length === 0) return text
  const hay = text.toLowerCase()
  const spans: { start: number; end: number }[] = []
  for (const needle of needles) {
    let i = hay.indexOf(needle)
    while (i !== -1) {
      spans.push({ start: i, end: i + needle.length })
      i = hay.indexOf(needle, i + 1)
    }
  }
  spans.sort((a, b) => a.start - b.start)
  const out: ReactNode[] = []
  let pos = 0
  let key = 0
  for (const s of spans) {
    if (s.start < pos) continue
    if (s.start > pos) out.push(text.slice(pos, s.start))
    out.push(
      <mark key={key++} className="rounded-[2px] bg-yellow-200 text-inherit">
        {text.slice(s.start, s.end)}
      </mark>,
    )
    pos = s.end
  }
  out.push(text.slice(pos))
  return out
}
