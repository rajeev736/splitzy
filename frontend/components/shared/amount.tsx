import { formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * Renders a paise amount. With `signed`, positive values are green with a "+"
 * prefix and negative values red — the convention used across every balance.
 */
export function Amount({
  paise,
  signed = false,
  className,
}: {
  paise: number
  signed?: boolean
  className?: string
}) {
  if (!signed) return <span className={cn("tabular-nums", className)}>{formatPaise(paise)}</span>
  return (
    <span className={cn("tabular-nums", paise >= 0 ? "text-success" : "text-destructive", className)}>
      {paise > 0 ? `+${formatPaise(paise)}` : formatPaise(paise)}
    </span>
  )
}
