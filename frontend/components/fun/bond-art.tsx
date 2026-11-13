import * as React from "react"

import type { BondId } from "@/lib/fun/catalog"
import { cn } from "@/lib/utils"

/**
 * One drawn icon per relationship tag, each about its name: two buddies side
 * by side, a bestie's star, bromance mugs clinking, siblings under one roof,
 * and the love heart. Line icons on a 24 grid in `currentColor`, so they sit
 * with the rest of the app's icons; `BOND_TONE` gives each tag its own soft tint.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

/** Two smiling friends, shoulder to shoulder. */
function Buddy() {
  return (
    <>
      {/* The left friend peeks out from behind the right one */}
      <path {...STROKE} d="M11.6 6.55A6.4 6.4 0 1 0 11.6 17.45" />
      <circle {...STROKE} cx="15.6" cy="12" r="6.4" />
      <circle cx="5.4" cy="10.6" r="1" fill="currentColor" />
      <circle cx="8.4" cy="10.6" r="1" fill="currentColor" />
      <path {...STROKE} d="M5 14q1.9 2 3.8 0" />
      <circle cx="14.1" cy="10.6" r="1" fill="currentColor" />
      <circle cx="17.1" cy="10.6" r="1" fill="currentColor" />
      <path {...STROKE} d="M13.7 14q1.9 2 3.8 0" />
    </>
  )
}

/** Your favourite person: a star with a little sparkle. */
function Bestie() {
  return (
    <>
      <path
        {...STROKE}
        d="M11 5.5L13 10.25L18.13 10.68L14.23 14.05L15.41 19.07L11 16.4L6.59 19.07L7.77 14.05L3.87 10.68L9 10.25Z"
      />
      <path d="M19.5 2.5Q19.9 4.1 21.5 4.5Q19.9 4.9 19.5 6.5Q19.1 4.9 17.5 4.5Q19.1 4.1 19.5 2.5Z" fill="currentColor" />
      <path d="M20 9.6Q20.2 10.3 20.9 10.5Q20.2 10.7 20 11.4Q19.8 10.7 19.1 10.5Q19.8 10.3 20 9.6Z" fill="currentColor" />
    </>
  )
}

/** One mug of the pair; the other is its mirror image. */
function Mug() {
  return (
    <g transform="rotate(12 6.5 19)">
      <path {...STROKE} d="M3 9.2V17.6A1.4 1.4 0 0 0 4.4 19H8.6A1.4 1.4 0 0 0 10 17.6V9.2" />
      <path {...STROKE} d="M3 11.5H2.4A1.7 1.7 0 0 0 0.7 13.2V14.3A1.7 1.7 0 0 0 2.4 16H3" />
      {/* Foam */}
      <path {...STROKE} d="M2.6 9.3Q2.8 7.5 4.7 7.9Q5.6 6.6 7.2 7.6Q8.9 7.1 10.4 9.3" />
      <path {...STROKE} d="M6.5 11.8V16.2" />
    </g>
  )
}

/** Brothers from another mother: two mugs clinking, cheers. */
function Bromance() {
  return (
    <>
      <Mug />
      <g transform="translate(24 0) scale(-1 1)">
        <Mug />
      </g>
      {/* The clink */}
      <path {...STROKE} d="M12 2.6V4.6M9.4 3.4L10.3 5M14.6 3.4L13.7 5" />
    </>
  )
}

/** Family: an older and a younger one under one roof. */
function Siblings() {
  return (
    <>
      <path {...STROKE} d="M2.8 10.6L12 3.6L21.2 10.6" />
      <path {...STROKE} d="M5 9V19.4A0.6 0.6 0 0 0 5.6 20H18.4A0.6 0.6 0 0 0 19 19.4V9" />
      <circle {...STROKE} cx="9.6" cy="12.4" r="1.75" />
      <path {...STROKE} d="M6.8 20V18.6A2.8 2.8 0 0 1 12.4 18.6V20" />
      <circle {...STROKE} cx="15" cy="14" r="1.35" />
      <path {...STROKE} d="M12.9 20V19.3A2.1 2.1 0 0 1 17.1 19.3V20" />
    </>
  )
}

function Love() {
  return (
    <path
      {...STROKE}
      d="M12 20s-7.5-4.4-8.9-9.2C2.3 7.8 4.1 4.8 7.2 4.8c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.1 0 4.9 3 4.1 6-1.4 4.8-8.9 9.2-8.9 9.2Z"
    />
  )
}

const ART: Record<BondId, () => React.JSX.Element> = {
  buddy: Buddy,
  bestie: Bestie,
  bromance: Bromance,
  siblings: Siblings,
  love: Love,
}

/** Each tag's tint: `chip` for the soft icon well, `text` for its label colour. */
export const BOND_TONE: Record<BondId, { chip: string; text: string; pill: string }> = {
  buddy: {
    chip: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
    text: "text-teal-700 dark:text-teal-300",
    pill: "border-teal-500/30 bg-teal-500/8 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
  },
  bestie: {
    chip: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
    text: "text-violet-700 dark:text-violet-300",
    pill: "border-violet-500/30 bg-violet-500/8 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300",
  },
  bromance: {
    chip: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
    pill: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
  },
  siblings: {
    chip: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
    pill: "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  love: {
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-300",
    pill: "border-rose-300/60 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
  },
}

export function BondGlyph({ bond, className }: { bond: BondId; className?: string }) {
  const Art = ART[bond]
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5 shrink-0", className)}>
      <Art />
    </svg>
  )
}
