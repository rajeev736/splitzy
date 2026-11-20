"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { teamOfSeat } from "@/lib/live/seats"
import type { LiveGameId, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { MatchLineup } from "../intro/lineup"
import { usePrefersReducedMotion } from "../intro/shared"
import { LoadingBar, SplashBackdrop, SplashLogo } from "./splash-scene"
import { SPLASH_CSS } from "./styles"
import { SPLASH_THEMES } from "./themes"

/** Shown at least this long: with players, enough to read the VS; alone, enough not to flicker. */
const MIN_PLAYERS_MS = 1600
const MIN_SOLO_MS = 1100
/** Back mid-game (a refresh): only if the game is slow to load, and then briefly. */
const RESUME_GRACE_MS = 250
const MIN_RESUME_MS = 500
/** Never longer than this from mount, ready or not. */
const MAX_MS = 4000
/** Ready after the minimum: let the bar reach 100% before fading. */
const FINISH_MS = 220
const FADE_MS = 250

/**
 * The one "match starting" screen, full-screen over the game while it mounts
 * and loads underneath: the game's logo on top, who's playing in the middle
 * (VS for two, teams for Ludo 2v2, a row for more) and a loading bar at the
 * bottom. It stays at least the minimum, leaves as soon as `ready` after that
 * (or at MAX_MS regardless) and fades out. Tap / Esc / Enter / Space skips it
 * once the minimum is up.
 *
 * `fresh`: the game has just started (see intro/shared shouldPlayIntro). If
 * not — a refresh mid-game — it shows only when the game's state takes more
 * than a moment to arrive, without the players, and briefly.
 */
export function GameSplash({
  game,
  ready,
  fresh,
  players = [],
  meId = "",
  teams = false,
}: {
  game: LiveGameId
  ready: boolean
  fresh: boolean
  /** Seat order; players who left are skipped. */
  players?: RoomPlayer[]
  meId?: string
  /** Ludo 2v2: the two teams face each other. */
  teams?: boolean
}) {
  const theme = SPLASH_THEMES[game]
  const reduced = usePrefersReducedMotion()
  const [visible, setVisible] = React.useState(fresh)
  const [minPassed, setMinPassed] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [gone, setGone] = React.useState(false)

  const lineup = React.useMemo(() => {
    if (!fresh) return []
    const inRoom = players.filter((p) => !p.left).slice(0, 8)
    if (inRoom.length < 2) return []
    // 2v2: Team A (seats 0 + 2) on the left, Team B (1 + 3) on the right
    return teams && inRoom.length === 4
      ? [...inRoom].sort((a, b) => teamOfSeat(a.seat) - teamOfSeat(b.seat) || a.seat - b.seat)
      : inRoom
  }, [fresh, players, teams])
  const minMs = !fresh ? MIN_RESUME_MS : lineup.length ? MIN_PLAYERS_MS : MIN_SOLO_MS

  // Resume: appear only if the state hasn't arrived after a moment
  React.useEffect(() => {
    if (fresh || visible || ready) return
    const id = window.setTimeout(() => setVisible(true), RESUME_GRACE_MS)
    return () => window.clearTimeout(id)
  }, [fresh, visible, ready])

  React.useEffect(() => {
    if (!visible) return
    const min = window.setTimeout(() => setMinPassed(true), minMs)
    const max = window.setTimeout(() => setLeaving(true), fresh ? MAX_MS : MAX_MS - RESUME_GRACE_MS)
    return () => [min, max].forEach(window.clearTimeout)
  }, [visible, minMs, fresh])

  React.useEffect(() => {
    if (!minPassed || !ready || leaving) return
    const id = window.setTimeout(() => setLeaving(true), FINISH_MS)
    return () => window.clearTimeout(id)
  }, [minPassed, ready, leaving])

  React.useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => setGone(true), FADE_MS)
    return () => window.clearTimeout(id)
  }, [leaving])

  const skip = React.useCallback(() => {
    if (minPassed) setLeaving(true)
  }, [minPassed])
  React.useEffect(() => {
    if (!visible || gone) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visible, gone, skip])

  if (!visible || gone || typeof document === "undefined") return null
  const duel = lineup.length === 2
  const label = lineup.length ? `Get ready: ${lineup.map((p) => p.name).join(duel ? " vs " : ", ")}` : "Loading the game"
  return createPortal(
    <div
      role="status"
      aria-label={label}
      className={cn("sp-root", reduced && "sp-reduced", minPassed && "cursor-pointer")}
      style={{ opacity: leaving ? 0 : 1, ["--sp-rim" as string]: theme.rim }}
      onPointerDown={skip}
    >
      <style>{SPLASH_CSS}</style>
      <SplashBackdrop theme={theme} />
      <div
        className="relative flex size-full max-w-5xl flex-col items-center px-4"
        style={{
          paddingTop: "max(5vh, calc(env(safe-area-inset-top, 0px) + 18px))",
          paddingBottom: "max(5vh, calc(env(safe-area-inset-bottom, 0px) + 18px))",
        }}
      >
        {lineup.length ? (
          <>
            <div className="flex-none">
              <SplashLogo game={game} theme={theme} />
            </div>
            <div className="flex min-h-0 w-full flex-1 items-center justify-center py-[2vh]">
              <MatchLineup players={lineup} meId={meId} teams={teams} reduced={reduced} rim={theme.rim} tint={theme.tint} />
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center pb-[6vh]">
            <SplashLogo game={game} theme={theme} big />
          </div>
        )}
        <div className="flex flex-none flex-col items-center gap-3">
          <LoadingBar minMs={minMs} finish={(ready && minPassed) || leaving} theme={theme} />
          <span className="sp-skip" style={{ visibility: minPassed && !leaving ? "visible" : "hidden" }}>
            Tap to skip
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
