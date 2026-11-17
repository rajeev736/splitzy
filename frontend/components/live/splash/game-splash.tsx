"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import type { LiveGameId } from "@/lib/live/types"
import { SPLASH_ART } from "./art"

/** Shown at least this long, so it reads as a splash and not a flicker. */
const MIN_MS = 1000
/** After a hold (the player intro ran over it), the time already spent counts, but the splash still shows this long. */
const MIN_AFTER_HOLD_MS = 450
/** Never longer than this, even if the game is still loading (counted from mount, hold included). */
const MAX_MS = 5000
const FADE_MS = 280

/**
 * The game's splash, full-screen over everything, while the game mounts and
 * loads underneath it. It stays at least `MIN_MS`, leaves as soon as `ready`
 * after that (or at `MAX_MS` regardless), and fades out. The loading bar runs
 * most of the way on its own and finishes when the game is ready.
 *
 * `hold`: something is shown over it (the player intro). The splash is mounted
 * and painted under it, but its clock waits: once released, the time held
 * counts toward the minimum (down to `MIN_AFTER_HOLD_MS`) and toward `MAX_MS`.
 */
export function GameSplash({ game, ready, hold = false }: { game: LiveGameId; ready: boolean; hold?: boolean }) {
  const [phase, setPhase] = React.useState<"min" | "wait" | "fade" | "gone">("min")
  const [progress, setProgress] = React.useState(0.08)
  const mountedAt = React.useRef(0)

  React.useEffect(() => {
    mountedAt.current = performance.now()
    // Let the bar animate from its start, then run up to 85% over the minimum time
    const run = window.setTimeout(() => setProgress(0.85), 30)
    return () => window.clearTimeout(run)
  }, [])

  React.useEffect(() => {
    if (hold) return
    const held = performance.now() - mountedAt.current
    const minMs = held > 50 ? Math.max(MIN_AFTER_HOLD_MS, MIN_MS - held) : MIN_MS
    const maxMs = Math.max(minMs, MAX_MS - held)
    const min = window.setTimeout(() => setPhase((p) => (p === "min" ? "wait" : p)), minMs)
    const max = window.setTimeout(() => setPhase((p) => (p === "gone" ? p : "fade")), maxMs)
    return () => [min, max].forEach(window.clearTimeout)
  }, [hold])

  // Past the minimum and the game is ready: fill the bar, then fade
  React.useEffect(() => {
    if (phase !== "wait" || !ready) return
    const id = window.setTimeout(() => setPhase("fade"), 160)
    return () => window.clearTimeout(id)
  }, [phase, ready])

  React.useEffect(() => {
    if (phase !== "fade") return
    const id = window.setTimeout(() => setPhase("gone"), FADE_MS)
    return () => window.clearTimeout(id)
  }, [phase])

  if (phase === "gone" || typeof document === "undefined") return null
  const Art = SPLASH_ART[game]
  const done = phase === "fade" || (phase === "wait" && ready)
  return createPortal(
    <div
      role="status"
      aria-label="Loading the game"
      className="fixed inset-0 z-[100] overflow-hidden transition-opacity ease-out select-none"
      style={{ opacity: phase === "fade" ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <Art progress={done ? 1 : progress} />
    </div>,
    document.body
  )
}
