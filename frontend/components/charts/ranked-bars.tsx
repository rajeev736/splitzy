import * as React from "react"

import { cn } from "@/lib/utils"

export interface RankedBarItem {
  id: string
  label: string
  value: number
  /** Leading visual (group icon, avatar). */
  leading?: React.ReactNode
  /** Secondary line under the label, e.g. "4 expenses". */
  detail?: React.ReactNode
  /** Extra content on the right under the value, e.g. a balance. */
  trailing?: React.ReactNode
}

/**
 * Single-series horizontal bars, largest first, every value labeled directly
 * (so no tooltip or legend is needed). Bars share one scale: the largest item.
 */
export function RankedBars({
  items,
  color,
  formatValue,
  className,
}: {
  items: RankedBarItem[]
  color: string
  formatValue: (v: number) => string
  className?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className={cn("flex flex-col gap-3.5", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3" title={`${item.label}: ${formatValue(item.value)}`}>
          {item.leading}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{item.label}</div>
                {item.detail && <div className="truncate text-[11px] text-muted-foreground">{item.detail}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold tabular-nums">{formatValue(item.value)}</div>
                {item.trailing}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
