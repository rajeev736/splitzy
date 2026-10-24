import {
  Invoice01Icon,
  MoneySend01Icon,
  Wallet01Icon,
  ChartAverageIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import type { Summary } from "@/lib/analytics"
import { formatPaise } from "@/lib/money"

function Tile({ icon, label, value, hint }: { icon: IconSvgElement; label: string; value: string; hint: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-4 shrink-0" />
        <span className="truncate text-xs">{label}</span>
      </div>
      <div className="truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  )
}

/** Headline numbers for the selected period. */
export function KpiTiles({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
      <Tile icon={Wallet01Icon} label="My spend" value={formatPaise(summary.spendPaise)} hint="Your share of every expense" />
      <Tile icon={MoneySend01Icon} label="Paid by me" value={formatPaise(summary.paidPaise)} hint="Bills you paid up front" />
      <Tile icon={Invoice01Icon} label="Expenses" value={summary.count.toLocaleString("en-IN")} hint="Group, friend & personal" />
      <Tile icon={ChartAverageIcon} label="Average" value={formatPaise(summary.avgSpendPaise)} hint="Your spend per expense" />
    </div>
  )
}
