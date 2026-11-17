"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { teamOfSeat } from "@/lib/live/seats"
import type { LiveGameId, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { BandIntro, bandTimeline } from "./band-intro"
import { FADE_MS, REDUCED_MS } from "./shared"
import { INTRO_CSS } from "./styles"
import { VS_TIMELINE, VsIntro } from "./vs-intro"

/** How long the intro runs, fade out included (ms). */
export function introDuration(players: number, teams: boolean, reduced: boolean) {
  if (reduced) return REDUCED_MS
  return players === 2 ? VS_TIMELINE.total : bandTimeline(players, teams).total
}

/**
 * The pre-game player intro, full-screen over the game's splash (which waits
 * under it, see GameSplash `hold`) while the game loads underneath both.
 * Two players get the VS screen, more get the colour bands (2v2 as two
 * teams). Tap / Esc / Enter / Space skips it. With reduced motion it's the
 * still frame, faded in and out. Calls `onDone` once it has faded out.
 */
export function PlayerIntro({
  game,
  players,
  meId,
  teams = false,
  onDone,
}: {
  game: LiveGameId
  /** Seat order; players who left are skipped. */
  players: RoomPlayer[]
  meId: string
  /** Ludo 2v2 (lib/live/seats): the teams on the two halves. */
  teams?: boolean
  onDone: () => void
}) {
  const [reduced] = React.useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  )
  const [leaving, setLeaving] = React.useState(false)
  const done = React.useRef(onDone)
  React.useEffect(() => {
    done.current = onDone
  })

  const team = teams && players.filter((p) => !p.left).length === 4
  const shown = React.useMemo(() => {
    const inRoom = players.filter((p) => !p.left).slice(0, 8)
    // 2v2: Team A (seats 0 + 2) on the top half, Team B (1 + 3) below
    return team ? [...inRoom].sort((a, b) => teamOfSeat(a.seat) - teamOfSeat(b.seat) || a.seat - b.seat) : inRoom
  }, [players, team])
  const duel = shown.length === 2
  const total = introDuration(shown.length, team, reduced)

  React.useEffect(() => {
    const id = window.setTimeout(() => setLeaving(true), total - FADE_MS)
    return () => window.clearTimeout(id)
  }, [total])

  React.useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => done.current(), FADE_MS)
    return () => window.clearTimeout(id)
  }, [leaving])

  const skip = React.useCallback(() => setLeaving(true), [])
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [skip])

  if (typeof document === "undefined") return null
  const label = shown.map((p) => p.name).join(duel ? " vs " : ", ")
  return createPortal(
    <div
      role="status"
      aria-label={`Get ready: ${label}`}
      className={cn("pi-root", reduced && "pi-reduced")}
      style={{ opacity: leaving ? 0 : 1, transition: `opacity ${FADE_MS}ms ease-out` }}
      onPointerDown={skip}
    >
      <style>{INTRO_CSS}</style>
      {duel ? (
        <VsIntro game={game} players={shown} meId={meId} reduced={reduced} />
      ) : (
        <BandIntro players={shown} meId={meId} teams={team} reduced={reduced} />
      )}
      <span className="pi-skip">Tap to skip</span>
    </div>,
    document.body
  )
}
