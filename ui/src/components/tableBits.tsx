import type { ComponentProps } from 'react'
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
