"use client"

import { formatCountdown } from "@/hooks/use-now"
import type { LiveGameDiscount } from "@/hooks/use-game-discounts"
import { formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"

/** Discount that actually applies to this balance (never more than the balance). */
export const appliedDiscount = (discount: LiveGameDiscount | undefined, amountPaise: number) =>
  discount ? Math.min(discount.discountPaise, amountPaise) : 0

/** Small "🎮 −₹20 · 8:41" chip shown next to any balance with a live game discount. */
export function GameDiscountChip({
  discount,
  amountPaise,
  now,
  className,
}: {
  discount: LiveGameDiscount
  amountPaise: number
  now: number
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-success",
        className
      )}
      title={discount.role === "winner" ? "You won a game: pay now to use the discount" : "They won your game"}
    >
      🎮 −{formatPaise(appliedDiscount(discount, amountPaise))} ({discount.percent}%) · {formatCountdown(discount.expiresAt - now)}
    </span>
  )
}

/**
 * A balance with a live game discount: the discounted amount, the original
 * struck through, and the countdown. Falls back to the plain amount otherwise.
 */
export function GameDiscountAmount({
  amountPaise,
  discount,
  now,
  className,
  prefix = "",
}: {
  amountPaise: number
  discount?: LiveGameDiscount
  now: number
  className?: string
  prefix?: string
}) {
  const off = appliedDiscount(discount, amountPaise)
  if (!discount || off <= 0) {
    return <span className={cn("tabular-nums", className)}>{prefix}{formatPaise(amountPaise)}</span>
  }
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted-foreground line-through tabular-nums">{formatPaise(amountPaise)}</span>
        <span className={cn("tabular-nums", className)}>{prefix}{formatPaise(amountPaise - off)}</span>
      </span>
      <GameDiscountChip discount={discount} amountPaise={amountPaise} now={now} />
    </span>
  )
}

/** "🎮 Includes ₹50 game discount · 5:54" under an overall balance while a discount is live. */
export function GameDiscountNote({
  discountPaise,
  endsAt,
  now,
  className,
}: {
  discountPaise: number
  endsAt: number
  now: number
  className?: string
}) {
  if (discountPaise <= 0 || now >= endsAt) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success",
        className
      )}
    >
      🎮 Includes {formatPaise(discountPaise)} game discount · {formatCountdown(endsAt - now)}
    </span>
  )
}
