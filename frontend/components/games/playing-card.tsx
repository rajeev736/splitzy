"use client"

import { motion } from "motion/react"

import { cardRank } from "@/lib/games"
import { cn } from "@/lib/utils"

/**
 * Playing cards for Higher or Lower. Only the value matters to the game; the
 * suit is decoration, picked from the card's position so a deal looks varied.
 */
type Suit = "spade" | "heart" | "club" | "diamond"
const SUITS: Suit[] = ["spade", "heart", "club", "diamond"]
export const suitFor = (index: number, value: number): Suit => SUITS[(index * 3 + value) % 4]
const isRed = (s: Suit) => s === "heart" || s === "diamond"

export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} fill="currentColor" aria-hidden>
      {suit === "heart" && (
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.7 1.2 5.3 3.2 1.6-2 3.2-3.2 5.3-3.2 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
      )}
      {suit === "diamond" && <path d="M12 2.5 20 12l-8 9.5L4 12z" />}
      {suit === "spade" && (
        <path d="M12 2.5s-8.5 6.1-8.5 10.8c0 2.6 2 4.4 4.3 4.4 1.4 0 2.6-.6 3.3-1.6-.2 2-1 3.6-2.6 5.4h7c-1.6-1.8-2.4-3.4-2.6-5.4.7 1 1.9 1.6 3.3 1.6 2.3 0 4.3-1.8 4.3-4.4 0-4.7-8.5-10.8-8.5-10.8z" />
      )}
      {suit === "club" && (
        <>
          <circle cx="12" cy="7.2" r="4.2" />
          <circle cx="6.9" cy="13.4" r="4.2" />
          <circle cx="17.1" cy="13.4" r="4.2" />
          <path d="M10.7 12.5h2.6c.2 3.6 1 5.9 2.9 9H7.8c1.9-3.1 2.7-5.4 2.9-9z" />
        </>
      )}
    </svg>
  )
}

const SIZES = {
  /** History strip. */
  xs: { box: "w-10 rounded-[5px]", rank: "text-[11px]", corner: "size-2", center: "size-4", pad: "p-0.5" },
  /** Host setup. */
  sm: { box: "w-12 rounded-md", rank: "text-xs", corner: "size-2.5", center: "size-5", pad: "p-1" },
  /** The cards in play. */
  lg: { box: "w-[5.75rem] min-[400px]:w-28 rounded-lg", rank: "text-base min-[400px]:text-lg", corner: "size-3.5", center: "size-10 min-[400px]:size-12", pad: "p-1.5" },
} as const

export type CardSize = keyof typeof SIZES

/** A card face up. Always white, like a real card, in light and dark mode. */
export function CardFace({
  value,
  index,
  size = "lg",
  className,
}: {
  value: number
  /** Position in the deal: picks the suit. */
  index: number
  size?: CardSize
  className?: string
}) {
  const s = SIZES[size]
  const suit = suitFor(index, value)
  const rank = cardRank(value)
  return (
    <div
      className={cn(
        "relative flex aspect-[5/7] flex-col justify-between border border-slate-300 bg-white font-bold shadow-sm select-none",
        isRed(suit) ? "text-red-600" : "text-slate-900",
        s.box,
        s.pad,
        className
      )}
      role="img"
      aria-label={`${rank} of ${suit}s`}
    >
      <span className={cn("flex flex-col items-start leading-none", s.rank)}>
        {rank}
        {size !== "xs" && <SuitIcon suit={suit} className={cn("mt-0.5", s.corner)} />}
      </span>
      <span className="absolute inset-0 flex items-center justify-center">
        <SuitIcon suit={suit} className={s.center} />
      </span>
      <span className={cn("flex rotate-180 flex-col items-start self-end leading-none", s.rank)}>
        {size === "xs" ? <SuitIcon suit={suit} className="size-2" /> : rank}
        {size !== "xs" && <SuitIcon suit={suit} className={cn("mt-0.5", s.corner)} />}
      </span>
    </div>
  )
}

/** The back of a card: the app's colour with a woven pattern. */
export function CardBack({ size = "lg", className }: { size?: CardSize; className?: string }) {
  const s = SIZES[size]
  return (
    <div
      className={cn("relative aspect-[5/7] overflow-hidden border border-primary/60 bg-primary shadow-sm", s.box, className)}
      aria-label="Face-down card"
      role="img"
    >
      <div
        className="absolute inset-[6%] rounded-[inherit] border border-white/40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.16) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.16) 0 2px, transparent 2px 9px)",
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-[38%] rotate-45 items-center justify-center rounded-[3px] border border-white/60 bg-white/15" />
      </span>
    </div>
  )
}

/**
 * A card that turns over in 3D when its value arrives: face down while
 * `value` is null, then flips to show it.
 */
export function FlipCard({
  value,
  index,
  size = "lg",
  className,
}: {
  value: number | null
  index: number
  size?: CardSize
  className?: string
}) {
  const faceUp = value !== null
  return (
    <div className={cn("relative", SIZES[size].box, className)} style={{ perspective: 900 }}>
      <motion.div
        className="relative aspect-[5/7] w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          {faceUp && <CardFace value={value} index={index} size={size} className="w-full" />}
        </div>
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <CardBack size={size} className="w-full" />
        </div>
      </motion.div>
    </div>
  )
}
