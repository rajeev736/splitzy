"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  RPS_LABEL,
  RPS_MOVES,
  RPS_ROUND_SECONDS,
  RPS_ROUNDS,
  RPS_TIMEOUT,
  type RpsMove,
  type RpsPlay,
} from "@/lib/games"
import { cn } from "@/lib/utils"

/** How long a locked-in pick stays on screen before the next round starts. */
const LOCKED_MS = 900

/**
 * Stone Paper Scissors, one round at a time: each round gives you
 * RPS_ROUND_SECONDS to pick; run out and that round is lost. After the last
 * round all three moves are locked in together (results show on the result
 * screen — the host's moves stay secret until then).
 */
export function RpsTimedPlay({
  hostName,
  disabled,
  onComplete,
}: {
  hostName: string
  disabled?: boolean
  onComplete: (moves: RpsPlay[]) => void
}) {
  const [started, setStarted] = React.useState(false)
  const [plays, setPlays] = React.useState<RpsPlay[]>([])
  /** The pick for the current round, shown briefly before moving on. */
  const [locked, setLocked] = React.useState<RpsPlay | null>(null)
  const [deadline, setDeadline] = React.useState(0)
  const [now, setNow] = React.useState(0)

  const round = plays.length
  const done = round >= RPS_ROUNDS

  const lockIn = React.useCallback(
    (move: RpsPlay) => {
      if (locked !== null || done) return
      setLocked(move)
    },
    [locked, done]
  )

  // Round clock: tick while a round is open; time running out picks "none"
  React.useEffect(() => {
    if (!started || done || locked !== null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= deadline) lockIn(RPS_TIMEOUT)
    }, 100)
    return () => window.clearInterval(id)
  }, [started, done, locked, deadline, lockIn])

  // After showing the pick, record it and start the next round (or finish)
  React.useEffect(() => {
    if (locked === null) return
    const id = window.setTimeout(() => {
      const next = [...plays, locked]
      setPlays(next)
      setLocked(null)
      if (next.length >= RPS_ROUNDS) {
        onComplete(next)
      } else {
        const t = Date.now()
        setNow(t)
        setDeadline(t + RPS_ROUND_SECONDS * 1000)
      }
    }, LOCKED_MS)
    return () => window.clearTimeout(id)
  }, [locked, plays, onComplete])

  const start = () => {
    const t = Date.now()
    setNow(t)
    setDeadline(t + RPS_ROUND_SECONDS * 1000)
    setStarted(true)
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex gap-2 text-4xl" aria-hidden>
          {RPS_MOVES.map((m) => (
            <span key={m}>{RPS_LABEL[m].emoji}</span>
          ))}
        </div>
        <p className="max-w-xs text-xs text-muted-foreground">
          {RPS_ROUNDS} rounds against {hostName}&apos;s secret moves. You get {RPS_ROUND_SECONDS} seconds per round —
          if time runs out, you lose that round.
        </p>
        <Button size="lg" className="h-11 w-full" onClick={start} disabled={disabled}>
          Start round 1
        </Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex gap-3 text-3xl" aria-label="Your moves">
          {plays.map((p, i) => (
            <span key={i} title={RPS_LABEL[p].name}>
              {RPS_LABEL[p].emoji}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Spinner /> Locking in your moves…
        </p>
      </div>
    )
  }

  const left = Math.max(0, deadline - now)
  const seconds = Math.ceil(left / 1000)
  const urgent = seconds <= 3

  return (
    <div className="flex flex-col gap-4">
      {/* Round dots */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Round {round + 1} of {RPS_ROUNDS}
        </span>
        <span className="flex gap-1.5" aria-hidden>
          {Array.from({ length: RPS_ROUNDS }, (_, i) => (
            <span
              key={i}
              className={cn("size-2 rounded-full", i < round ? "bg-primary" : i === round ? "bg-primary/50" : "bg-muted")}
            />
          ))}
        </span>
      </div>

      {/* Timer */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", urgent ? "bg-destructive" : "bg-primary")}
            style={{ width: `${locked !== null ? 0 : (left / (RPS_ROUND_SECONDS * 1000)) * 100}%` }}
          />
        </div>
        <p
          className={cn(
            "text-center text-xs font-medium tabular-nums",
            urgent && locked === null ? "text-destructive" : "text-muted-foreground"
          )}
          aria-live="polite"
        >
          {locked === null
            ? `${seconds}s left`
            : locked === RPS_TIMEOUT
              ? "Time's up — round lost"
              : `Locked in: ${RPS_LABEL[locked].name}`}
        </p>
      </div>

      {/* Moves */}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={`Round ${round + 1}`}>
        {RPS_MOVES.map((move: RpsMove) => {
          const picked = locked === move
          return (
            <button
              key={move}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={disabled || locked !== null}
              onClick={() => lockIn(move)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border bg-card py-4 transition-all active:scale-95 disabled:cursor-default",
                picked ? "border-primary bg-primary/10 ring-2 ring-primary" : locked !== null ? "opacity-40" : "hover:bg-muted/60"
              )}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {RPS_LABEL[move].emoji}
              </span>
              <span className="text-xs font-medium">{RPS_LABEL[move].name}</span>
            </button>
          )
        })}
      </div>

      {/* Picks so far */}
      {round > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Your picks: {plays.map((p) => RPS_LABEL[p].emoji).join("  ")}
        </p>
      )}
    </div>
  )
}
