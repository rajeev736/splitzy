"use client"

import * as React from "react"

import { AUTO_START_SECONDS } from "@/lib/live/room"
import { cn } from "@/lib/utils"
import { Gloss } from "./lobby-styles"

/**
 * Whole seconds left until `startsAt` (server time), ticking right on each
 * second's boundary (the room's shared clock ticks once a second at an
 * arbitrary offset, which would make a 3-2-1 stutter or skip a number).
 * Remount (key) on a new `startsAt`.
 */
function useSecondsLeft(startsAt: number, serverNow: () => number) {
  const [left, setLeft] = React.useState(() => Math.max(0, Math.ceil((startsAt - serverNow()) / 1000)))
  React.useEffect(() => {
    let id = 0
    const schedule = () => {
      const ms = startsAt - serverNow()
      if (ms <= 0) return
      id = window.setTimeout(() => {
        setLeft(Math.max(0, Math.ceil((startsAt - serverNow()) / 1000)))
        schedule()
      }, (ms % 1000 || 1000) + 10)
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [startsAt, serverNow])
  return left
}

/** A soft dark vignette over the lobby while it counts down, so the eye goes to the middle. */
export function CountdownScrim() {
  return <div aria-hidden className="lb-count-scrim z-[5]" />
}

/**
 * "Starting in" over a big number popping in each second (3 · 2 · 1, then
 * "GO!"), with a dot per second. Sits where the start button was, under the
 * players, so everyone stays in view. The number's disc scales with the screen height.
 */
export function LobbyCountdown({
  startsAt,
  serverNow,
}: {
  startsAt: number
  serverNow: () => number
}) {
  const left = useSecondsLeft(startsAt, serverNow)
  const [size] = React.useState(() =>
    typeof window === "undefined" ? 72 : Math.round(Math.min(96, Math.max(54, window.innerHeight * 0.1)))
  )
  const steps = Math.max(AUTO_START_SECONDS, left)
  return (
    <div className="relative z-10 flex flex-col items-center gap-2" role="timer" aria-live="assertive" aria-label={left > 0 ? `Starting in ${left}` : "Starting"}>
      <Gloss size={Math.round(Math.max(16, size * 0.27))} rim="#5b1a7a" tint="#ffe08a">
        {left > 0 ? "Starting in" : "Here we go!"}
      </Gloss>
      <div key={left} className="lb-count lb-count-num" style={{ width: size, height: size }}>
        <Gloss size={Math.round(size * (left > 0 ? 0.62 : 0.34))} rim="#2a0b52" tint="#ffd24a" top="#ffffff">
          {left > 0 ? left : "GO!"}
        </Gloss>
      </div>
      <div aria-hidden className="flex gap-2 pt-1">
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className={cn("lb-dot", steps - i >= left + 1 && "lb-dot-on")} />
        ))}
      </div>
    </div>
  )
}
