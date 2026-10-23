"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { ChartSeries } from "./series"

const R = 40
const STROKE = 12
const CIRC = 2 * Math.PI * R
/** Surface gap between segments, in viewBox units (~2px at the rendered size). */
const GAP = 1.6

/**
 * Part-to-whole ring with a total in the middle and a legend that always shows
 * label, value and share — identity is never carried by color alone.
 */
export function DonutChart({
  series,
  values,
  formatValue,
  centerLabel,
  className,
}: {
  series: ChartSeries[]
  values: Record<string, number>
  formatValue: (v: number) => string
  centerLabel: string
  className?: string
}) {
  const [active, setActive] = React.useState<string | null>(null)
  const total = series.reduce((s, x) => s + (values[x.key] ?? 0), 0)
  const present = series.filter((s) => (values[s.key] ?? 0) > 0)

  const fracs = present.map((s) => (values[s.key] ?? 0) / (total || 1))
  const arcs = present.map((s, i) => ({
    s,
    length: Math.max(0, fracs[i] * CIRC - (present.length > 1 ? GAP : 0)),
    offset: fracs.slice(0, i).reduce((sum, f) => sum + f, 0) * CIRC,
  }))

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row", className)}>
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${centerLabel}: ${formatValue(total)}`}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />
          {arcs.map(({ s, length, offset }) => (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.key ? STROKE + 2 : STROKE}
              strokeDasharray={`${length} ${CIRC - length}`}
              strokeDashoffset={-offset}
              className={cn("transition-all", active && active !== s.key && "opacity-40")}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">{centerLabel}</span>
          <span className="text-base font-black tabular-nums">{formatValue(total)}</span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-1.5">
        {series.map((s) => {
          const v = values[s.key] ?? 0
          const pct = total ? Math.round((v / total) * 100) : 0
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-xs transition-colors",
                active === s.key && "bg-muted"
              )}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="font-bold">{formatValue(v)}</span>
                <span className="w-9 text-right text-muted-foreground">{pct}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
