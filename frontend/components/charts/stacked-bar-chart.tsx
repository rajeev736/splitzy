"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { ChartSeries } from "./series"

export interface StackedBarDatum {
  key: string
  label: string
  fullLabel: string
  values: Record<string, number>
  total: number
}

const PLOT_HEIGHT = 176
const MAX_X_LABELS = 8

/**
 * Vertical stacked bars with a recessive 3-line grid, sparse x labels and a
 * per-bar tooltip (hover, keyboard focus, or tap on touch screens).
 */
export function StackedBarChart({
  data,
  series,
  formatValue,
  formatAxis,
  axisMax,
  className,
}: {
  data: StackedBarDatum[]
  series: ChartSeries[]
  formatValue: (v: number) => string
  formatAxis: (v: number) => string
  /** Top of the y axis (a "nice" value ≥ the largest total). */
  axisMax: number
  className?: string
}) {
  const [active, setActive] = React.useState<number | null>(null)
  const labelEvery = Math.max(1, Math.ceil(data.length / MAX_X_LABELS))
  const ticks = [axisMax, axisMax / 2, 0]
  const activeDatum = active !== null ? data[active] : null

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Y axis */}
      <div className="flex shrink-0 flex-col justify-between text-right text-[10px] text-muted-foreground tabular-nums" style={{ height: PLOT_HEIGHT }}>
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {formatAxis(t)}
          </span>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        {/* Grid */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((t) => (
            <div key={t} className={cn("border-t", t === 0 ? "border-border" : "border-dashed border-border/60")} />
          ))}
        </div>

        {/* Bars */}
        <div className="relative flex items-end" style={{ height: PLOT_HEIGHT }} onMouseLeave={() => setActive(null)}>
          {data.map((d, i) => {
            const visible = series.filter((s) => (d.values[s.key] ?? 0) > 0)
            return (
              <button
                key={d.key}
                type="button"
                className="group/bar flex h-full min-w-0 flex-1 cursor-default items-end justify-center px-[2px] outline-none focus-visible:bg-muted/60"
                aria-label={`${d.fullLabel}: ${formatValue(d.total)}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((cur) => (cur === i ? null : i))}
              >
                <div
                  className={cn(
                    "flex w-full max-w-7 flex-col-reverse gap-[2px] transition-opacity",
                    active !== null && active !== i && "opacity-40"
                  )}
                  style={{ height: `${Math.min(100, (d.total / axisMax) * 100)}%` }}
                >
                  {visible.map((s, si) => (
                    <div
                      key={s.key}
                      className={cn("min-h-[2px] w-full", si === visible.length - 1 && "rounded-t-[4px]")}
                      style={{ flexGrow: d.values[s.key], flexBasis: 0, background: s.color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* X labels */}
        <div className="mt-1.5 flex">
          {data.map((d, i) => (
            <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground">
              {i % labelEvery === 0 || i === data.length - 1 ? d.label : ""}
            </span>
          ))}
        </div>

        {/* Tooltip */}
        {activeDatum && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 min-w-36 rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
            style={{
              left: `${((active + 0.5) / data.length) * 100}%`,
              transform: `translate(${active < data.length / 3 ? "-15%" : active > (data.length * 2) / 3 ? "-85%" : "-50%"}, -100%)`,
            }}
          >
            <div className="mb-1 font-bold">{activeDatum.fullLabel}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums">{formatValue(activeDatum.values[s.key] ?? 0)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-3 border-t pt-1 font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatValue(activeDatum.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
