"use client"

import * as React from "react"
import { ChartColumnIcon, Table01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { ChartSeries } from "@/components/charts/series"
import { StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { Button } from "@/components/ui/button"
import { formatCompactPaise, niceMaxPaise, type TrendBucket } from "@/lib/analytics"
import { formatPaise } from "@/lib/money"
import { SectionCard, SectionEmpty } from "./section-card"

/** Spend over time by type, with a legend and a table view of the same data. */
export function TrendCard({
  buckets,
  series,
  daily,
  className,
}: {
  buckets: TrendBucket[]
  series: ChartSeries[]
  daily: boolean
  className?: string
}) {
  const [asTable, setAsTable] = React.useState(false)
  const max = niceMaxPaise(Math.max(0, ...buckets.map((b) => b.total)))
  const hasData = buckets.some((b) => b.total > 0)

  return (
    <SectionCard
      title={daily ? "Daily spend" : "Monthly spend"}
      description="Your share, split by type"
      className={className}
      action={
        hasData && (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={asTable}
            onClick={() => setAsTable((v) => !v)}
            className="text-xs"
          >
            <HugeiconsIcon icon={asTable ? ChartColumnIcon : Table01Icon} data-icon="inline-start" />
            {asTable ? "Chart" : "Table"}
          </Button>
        )
      }
    >
      {!hasData ? (
        <SectionEmpty>No spending in this period yet.</SectionEmpty>
      ) : asTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="sticky top-0 border-b bg-card text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 text-left font-medium">{daily ? "Day" : "Month"}</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                <th className="py-2 pl-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {buckets
                .filter((b) => b.total > 0)
                .map((b) => (
                  <tr key={b.key} className="border-t">
                    <td className="py-2 pr-3 font-medium">{b.fullLabel}</td>
                    {series.map((s) => (
                      <td key={s.key} className="px-3 py-2 text-right">
                        {formatPaise(b.values[s.key as keyof TrendBucket["values"]])}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-semibold">{formatPaise(b.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-10">
          <StackedBarChart
            data={buckets}
            series={series}
            axisMax={max}
            formatValue={formatPaise}
            formatAxis={formatCompactPaise}
          />
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}
