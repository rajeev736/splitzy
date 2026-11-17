"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { CharacterDef, CharacterMode } from "./types"

type Shape = "circle" | "card" | "square"
const ROUND: Record<Shape, string> = { circle: "rounded-full", card: "rounded-[22%]", square: "" }

const TIER_LABEL = { basic: "Free", premium: "Premium", legend: "Legend" } as const

/**
 * One character's art on its accent colour, from the def itself — for the
 * store, pickers and reward cards (inside games, use GameAvatar with the
 * player's ids). `shape`: a circle like a seat, a rounded card, or square.
 *
 * `replay` changes restart the intro (a new key remounts the art).
 */
export function CharacterTile({
  def,
  size,
  mode = "still",
  shape = "circle",
  replay = 0,
  className,
}: {
  def: CharacterDef
  size: number
  mode?: CharacterMode
  shape?: Shape
  replay?: number
  className?: string
}) {
  // Under reduced motion every tile stands still
  const reduced = useReducedMotion()
  return (
    <span
      role="img"
      aria-label={def.name}
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden",
        ROUND[shape],
        className
      )}
      style={{ width: size, height: size, background: def.accent }}
    >
      <def.Art key={replay} mode={reduced ? "still" : mode} size={size} />
    </span>
  )
}

/** A CharacterTile filling its container's width (a square), for cards. */
export function CharacterFill({
  def,
  mode = "still",
  shape = "card",
  replay = 0,
  className,
}: {
  def: CharacterDef
  mode?: CharacterMode
  shape?: Shape
  replay?: number
  className?: string
}) {
  const box = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div
      ref={box}
      className={cn("aspect-square w-full overflow-hidden", ROUND[shape], className)}
      style={{ background: def.accent }}
    >
      {size > 0 && <CharacterTile def={def} size={size} mode={mode} shape={shape} replay={replay} />}
    </div>
  )
}

const query = "(prefers-reduced-motion: reduce)"
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(query)
  m.addEventListener("change", cb)
  return () => m.removeEventListener("change", cb)
}
function useReducedMotion() {
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

/** Free · Premium · Legend, as a small pill. */
export function TierChip({ def, className }: { def: CharacterDef; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        def.tier === "legend"
          ? "bg-gradient-to-r from-amber-300 to-orange-400 text-amber-950"
          : def.tier === "premium"
            ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
            : "bg-muted text-muted-foreground",
        className
      )}
    >
      {TIER_LABEL[def.tier]}
    </span>
  )
}
