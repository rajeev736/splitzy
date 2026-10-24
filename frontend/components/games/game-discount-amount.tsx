"use client"

import { formatCountdown } from "@/hooks/use-now"
import type { LiveGameDiscount } from "@/hooks/use-game-discounts"
import { formatPaise } from "@/lib/money"
import { cn } from "@/lib/utils"

/** Quiet one-line text under a balance: no pill, no fill — just the facts and the clock. */
const DISCOUNT_TEXT = "text-[11px] leading-tight text-muted-foreground whitespace-nowrap"

/**
 * "₹60 off · 4:35" — the countdown is the only emphasised part. A discount
 * already used on a payment awaiting confirmation has no clock (Infinity).
 */
function DiscountLine({ label, msLeft, className }: { label: string; msLeft: number; className?: string }) {
  return (
    <span className={cn(DISCOUNT_TEXT, className)}>
      {label} ·{" "}
      {Number.isFinite(msLeft) ? (
        <span className="font-semibold text-foreground tabular-nums">{formatCountdown(msLeft)}</span>
      ) : (
        "awaiting confirmation"
      )}
    </span>
  )
}

/** Discount that actually applies to this balance (never more than the balance). */
export const appliedDiscount = (discount: LiveGameDiscount | undefined, amountPaise: number) =>
  discount ? Math.min(discount.discountPaise, amountPaise) : 0

/** "₹20 off (20%) · 8:41" next to any balance with a live game discount. */
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
    <span title={discount.role === "winner" ? "You won a game: pay now to use the discount" : "They won your game"}>
      <DiscountLine
        className={className}
        label={`${formatPaise(appliedDiscount(discount, amountPaise))} off (${discount.percent}%)`}
        msLeft={discount.expiresAt - now}
      />
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
        {/* A win that covers it all reads "Free", never "₹0" */}
        <span className={cn("tabular-nums", className)}>
          {amountPaise - off === 0 ? "Free" : `${prefix}${formatPaise(amountPaise - off)}`}
        </span>
      </span>
      <GameDiscountChip discount={discount} amountPaise={amountPaise} now={now} />
    </span>
  )
}

/** Compact "₹20 off · 8:41" for list rows whose balance already includes a game discount. */
export function GameDiscountTag({
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
  return <DiscountLine className={className} label={`${formatPaise(discountPaise)} off`} msLeft={endsAt - now} />
}

/** "Includes ₹50 game discount · 5:54" under an overall balance while a discount is live. */
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
    <DiscountLine
      className={cn("block whitespace-normal", className)}
      label={`Includes ${formatPaise(discountPaise)} game discount`}
      msLeft={endsAt - now}
    />
  )
}
