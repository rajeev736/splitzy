"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  beats,
  RPS_LABEL,
  RPS_MOVES,
  RPS_ROUND_SECONDS,
  RPS_ROUNDS,
  RPS_TIMEOUT,
  type RpsMove,
  type RpsPlay,
} from "@/lib/games"
import { cn } from "@/lib/utils"

/** How long a locked-in pick stays on screen when there's no per-round result. */
const LOCKED_MS = 900
/** How long each round's result stays on screen before the next round starts. */
const RESULT_MS = 2200

type Outcome = "you" | "them" | "draw"
const outcomeOf = (you: RpsPlay, them: RpsMove): Outcome =>
  beats(you, them) ? "you" : beats(them, you) ? "them" : "draw"

/**
 * Stone Paper Scissors, one round at a time: each round gives you
 * RPS_ROUND_SECONDS to pick; run out and that round is lost. With `playRound`
 * (friend games), each pick is saved and the host's move for that round is
 * revealed right away, with the running score, before the next round. Without
 * it, the picks show only as "locked in" and the result comes at the end.
 * After the last round all three moves are locked in together.
 */
export function RpsTimedPlay({
  hostName,
  disabled,
  initialPlays = [],
  playRound,
  revealRound,
  onComplete,
}: {
  hostName: string
  disabled?: boolean
  /** Rounds already played (e.g. after a reload): they can't be replayed. */
  initialPlays?: RpsPlay[]
  /** Saves the picks so far and returns the host's move for the latest round (null: no per-round result). */
  playRound?: (plays: RpsPlay[]) => Promise<RpsMove | null>
  /** The host's move for a round already played, to show it again after a reload. */
  revealRound?: (round: number) => Promise<RpsMove | null>
  onComplete: (moves: RpsPlay[]) => void
}) {
  const host = hostName.split(" ")[0]
  const [started, setStarted] = React.useState(initialPlays.length > 0)
  const [plays, setPlays] = React.useState<RpsPlay[]>(initialPlays)
  /** The host's move per round, once revealed. */
  const [hostMoves, setHostMoves] = React.useState<(RpsMove | null)[]>([])
  /** The pick for the current round while it's being saved / shown. */
  const [locked, setLocked] = React.useState<RpsPlay | null>(null)
  /** The just-finished round's result, shown before the next round. */
  const [showing, setShowing] = React.useState<number | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [deadline, setDeadline] = React.useState(0)
  const [now, setNow] = React.useState(0)

  const round = plays.length
  const done = round >= RPS_ROUNDS

  // After a reload: show the results of the rounds already played
  const resumed = React.useRef(false)
  React.useEffect(() => {
    if (resumed.current || !revealRound || initialPlays.length === 0) return
    resumed.current = true
    void Promise.all(initialPlays.map((_, i) => revealRound(i))).then(setHostMoves)
  }, [initialPlays, revealRound])

  // All rounds played (now or before a reload): lock the moves in
  const completed = React.useRef(false)
  React.useEffect(() => {
    if (!done || showing !== null || completed.current) return
    completed.current = true
    onComplete(plays)
  }, [done, showing, plays, onComplete])

  const startRound = React.useCallback(() => {
    const t = Date.now()
    setNow(t)
    setDeadline(t + RPS_ROUND_SECONDS * 1000)
  }, [])

  /** Saves this round's pick, reveals the host's move, then moves on. */
  const finishRound = React.useCallback(
    async (move: RpsPlay) => {
      const next = [...plays, move]
      setFailed(false)
      let hostMove: RpsMove | null = null
      try {
        hostMove = playRound ? await playRound(next) : null
      } catch {
        setFailed(true) // keep the pick on screen; "Try again" saves it again
        return
      }
      setPlays(next)
      setHostMoves((prev) => {
        const copy = [...prev]
        copy[next.length - 1] = hostMove
        return copy
      })
      setLocked(null)
      setShowing(next.length - 1)
      window.setTimeout(
        () => {
          setShowing(null)
          if (next.length < RPS_ROUNDS) startRound()
        },
        hostMove ? RESULT_MS : LOCKED_MS
      )
    },
    [plays, playRound, startRound]
  )

  const lockIn = React.useCallback(
    (move: RpsPlay) => {
      if (locked !== null || done || showing !== null) return
      setLocked(move)
      void finishRound(move)
    },
    [locked, done, showing, finishRound]
  )

  // Round clock: tick while a round is open; time running out picks "none"
  React.useEffect(() => {
    if (!started || done || locked !== null || showing !== null || deadline === 0) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= deadline) lockIn(RPS_TIMEOUT)
    }, 100)
    return () => window.clearInterval(id)
  }, [started, done, locked, showing, deadline, lockIn])

  // Score from the rounds whose result is known
  const score = plays.reduce(
    (acc, p, i) => {
      const h = hostMoves[i]
      if (!h) return acc
      const o = outcomeOf(p, h)
      return { you: acc.you + (o === "you" ? 1 : 0), them: acc.them + (o === "them" ? 1 : 0), known: acc.known + 1 }
    },
    { you: 0, them: 0, known: 0 }
  )

  const start = () => {
    startRound()
    setStarted(true)
  }

  if (!started || (deadline === 0 && !done && showing === null)) {
    const resuming = plays.length > 0
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex gap-2 text-4xl" aria-hidden>
          {RPS_MOVES.map((m) => (
            <span key={m}>{RPS_LABEL[m].emoji}</span>
          ))}
        </div>
        <p className="max-w-xs text-xs text-muted-foreground">
          {RPS_ROUNDS} rounds against {host}&apos;s secret moves
          {playRound ? ", with the result after every round" : ""}. You get {RPS_ROUND_SECONDS} seconds per round —
          if time runs out, you lose that round.
        </p>
        {resuming && score.known > 0 && <ScoreLine you={score.you} them={score.them} host={host} />}
        <Button size="lg" className="h-11 w-full" onClick={start} disabled={disabled}>
          {resuming ? `Continue with round ${plays.length + 1}` : "Start round 1"}
        </Button>
      </div>
    )
  }

  // A round just ended: its result (or just the locked-in pick for older games)
  if (showing !== null) {
    const you = plays[showing]
    const them = hostMoves[showing]
    const outcome = them ? outcomeOf(you, them) : null
    const last = showing === RPS_ROUNDS - 1
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center" aria-live="polite">
        <span className="text-xs font-semibold text-muted-foreground">
          Round {showing + 1} of {RPS_ROUNDS}
        </span>
        {them ? (
          <>
            <div className="flex w-full items-center justify-center gap-6">
              <Hand label="You" play={you} highlight={outcome === "you"} />
              <span className="text-xs font-semibold text-muted-foreground">vs</span>
              <Hand label={host} play={them} highlight={outcome === "them"} />
            </div>
            <p
              className={cn(
                "text-lg font-bold",
                outcome === "you" ? "text-success" : outcome === "them" ? "text-destructive" : "text-foreground"
              )}
            >
              {you === RPS_TIMEOUT
                ? "Time's up — round lost"
                : outcome === "you"
                  ? `You won round ${showing + 1}!`
                  : outcome === "them"
                    ? `${host} won round ${showing + 1}`
                    : "Draw"}
            </p>
            <ScoreLine you={score.you} them={score.them} host={host} />
            {!last && (
              <p className="text-xs font-medium text-muted-foreground">
                {showing === RPS_ROUNDS - 2 && score.you === score.them
                  ? "All square — the final round decides it 🔥"
                  : `Round ${showing + 2} coming up…`}
              </p>
            )}
            {last && (
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Spinner /> Locking in the result…
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-medium">
            {you === RPS_TIMEOUT ? "Time's up — round lost" : `Locked in: ${RPS_LABEL[you].name}`}
          </p>
        )}
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
        {score.known > 0 && <ScoreLine you={score.you} them={score.them} host={host} />}
        <p className="flex items-center gap-2 text-sm font-medium">
          <Spinner /> Locking in your moves…
        </p>
      </div>
    )
  }

  const left = Math.max(0, deadline - now)
  const seconds = Math.ceil(left / 1000)
  const urgent = seconds <= 3
  const decider = round === RPS_ROUNDS - 1 && score.known === round && score.you === score.them

  return (
    <div className="flex flex-col gap-4">
      {/* Round, score, dots */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          {round === RPS_ROUNDS - 1 ? "Final round" : `Round ${round + 1} of ${RPS_ROUNDS}`}
          {decider && <span className="ml-1.5 text-xs font-medium text-destructive">· decider</span>}
        </span>
        {score.known > 0 ? (
          <ScoreLine you={score.you} them={score.them} host={host} compact />
        ) : (
          <span className="flex gap-1.5" aria-hidden>
            {Array.from({ length: RPS_ROUNDS }, (_, i) => (
              <span
                key={i}
                className={cn("size-2 rounded-full", i < round ? "bg-primary" : i === round ? "bg-primary/50" : "bg-muted")}
              />
            ))}
          </span>
        )}
      </div>

      {/* Timer */}
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-100 ease-linear",
              urgent ? "bg-destructive" : "bg-primary"
            )}
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
            : failed
              ? "Couldn't save this round"
              : locked === RPS_TIMEOUT
                ? "Time's up…"
                : playRound
                  ? `${RPS_LABEL[locked].name}! Revealing ${host}'s move…`
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
                picked
                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                  : locked !== null
                    ? "opacity-40"
                    : "hover:bg-muted/60"
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

      {failed && locked !== null && (
        <Button variant="outline" onClick={() => void finishRound(locked)}>
          Try again
        </Button>
      )}

      {/* Earlier rounds */}
      {round > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {plays
            .map((p, i) => {
              const h = hostMoves[i]
              return h ? `${RPS_LABEL[p].emoji} vs ${RPS_LABEL[h].emoji}` : RPS_LABEL[p].emoji
            })
            .join("   ·   ")}
        </p>
      )}
    </div>
  )
}

function Hand({ label, play, highlight }: { label: string; play: RpsPlay; highlight: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-full border text-4xl transition-all",
          highlight ? "scale-110 border-success bg-success/10" : "bg-card"
        )}
        aria-label={RPS_LABEL[play].name}
      >
        {RPS_LABEL[play].emoji}
      </span>
      <span className="max-w-20 truncate text-xs font-medium">{label}</span>
    </div>
  )
}

function ScoreLine({ you, them, host, compact }: { you: number; them: number; host: string; compact?: boolean }) {
  return (
    <span className={cn("tabular-nums", compact ? "text-xs font-semibold" : "text-sm font-semibold")}>
      You <span className={cn(you > them && "text-success")}>{you}</span> –{" "}
      <span className={cn(them > you && "text-destructive")}>{them}</span> {host}
    </span>
  )
}
