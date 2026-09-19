import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function DotBadge({
  tone,
  children,
}: {
  tone: 'good' | 'bad' | 'neutral'
  children: ReactNode
}) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          tone === 'good' && 'bg-green-500',
          tone === 'bad' && 'bg-red-500',
          tone === 'neutral' && 'bg-zinc-300',
        )}
      />
      {children}
    </Badge>
  )
}
