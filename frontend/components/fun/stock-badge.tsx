import { cn } from "@/lib/utils"

/**
 * How many of a throwable or gift you have left (bought ahead in the
 * inventory), as a little pill on the item's corner. Nothing when there are none.
 */
export function StockBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={`${count} left`}
      className={cn(
        "pointer-events-none absolute -top-1.5 -left-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
        "bg-gradient-to-b from-emerald-400 to-emerald-600 text-[11px] leading-none font-extrabold text-white tabular-nums",
        "shadow-[0_0_0_2px_#fff,0_2px_4px_rgb(0_0_0/0.25)] animate-in zoom-in-50 duration-200",
        className
      )}
    >
      ×{count > 999 ? "999+" : count}
    </span>
  )
}
