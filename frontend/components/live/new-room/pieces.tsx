"use client"

import * as React from "react"
import { UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameChoice } from "@/components/game-ui/kit"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAME_IDS, LIVE_GAMES, type LiveGameInfo } from "@/lib/live/games"
import { isTeamOptions } from "@/lib/live/seats"
import type { LiveGameId, RoomOptions } from "@/lib/live/types"
import { cn } from "@/lib/utils"

/** "2 players" / "2–8 players". */
export const playersLabel = (g: Pick<LiveGameInfo, "minPlayers" | "maxPlayers">) =>
  g.minPlayers === g.maxPlayers ? `${g.maxPlayers} players` : `${g.minPlayers}–${g.maxPlayers} players`

/** A soft colour per game for its tile's glow. */
export const GAME_GLOW: Record<LiveGameId, string> = {
  scribble: "#f472b6",
  ludo: "#f87171",
  chess: "#94a3b8",
  checkers: "#fb923c",
  tictactoe: "#60a5fa",
  snakes: "#4ade80",
  snakes3d: "#34d399",
  sudoku: "#a78bfa",
}

/**
 * The games to start, as big glossy tiles (2 per row on phones): the logo,
 * the name and how many play. A dot marks games you played lately.
 */
export function LiveGameGrid({
  onPick,
  recent = [],
  games = LIVE_GAME_IDS,
  className,
}: {
  onPick: (game: LiveGameId) => void
  recent?: LiveGameId[]
  games?: readonly LiveGameId[]
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {games.map((id) => {
        const g = LIVE_GAMES[id]
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            aria-label={`Play ${g.name}`}
            className="gu-panel-flat group relative flex flex-col items-center gap-2 overflow-hidden px-2 pt-4 pb-3 text-center transition-transform active:translate-y-0.5"
            style={{ backgroundImage: `radial-gradient(90% 70% at 50% 0%, ${GAME_GLOW[id]}40, transparent 70%)` }}
          >
            {recent.includes(id) ? (
              <span className="gu-chip absolute top-2 left-2 z-10 !px-2 !py-0.5 text-[10px] text-[var(--gu-blue-deep)]">Recent</span>
            ) : null}
            <LiveGameLogo game={id} className="size-[4.5rem] rounded-[1.4rem] drop-shadow-[0_4px_0_rgba(44,63,115,.18)]" />
            <span className="w-full truncate text-[1.05rem] leading-tight font-bold">{g.shortName ?? g.name}</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--gu-ink-soft)]">
              <HugeiconsIcon icon={UserGroupIcon} className="size-3.5" strokeWidth={2.2} />
              {playersLabel(g)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The game being set up: logo, name, who plays, how long, the one-liner. */
export function GameHero({ game, picks }: { game: LiveGameId; picks?: RoomOptions }) {
  const info = LIVE_GAMES[game]
  const teams = picks ? isTeamOptions(game, picks) : false
  return (
    <div className="flex items-center gap-4">
      <LiveGameLogo game={game} className="size-20 shrink-0 rounded-[1.5rem] drop-shadow-[0_4px_0_rgba(44,63,115,.2)]" />
      <div className="min-w-0">
        <p className="truncate text-2xl leading-tight font-bold">{info.name}</p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--gu-ink-soft)]">{info.tagline}</p>
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="gu-chip">{teams ? "4 players · 2 v 2" : playersLabel(info)}</span>
          <span className="gu-chip">{info.duration}</span>
        </p>
      </div>
    </div>
  )
}

/** Every setting of a game as rows of big cards to tap — no dropdowns in a game. */
export function GameOptionsPicker({
  game,
  picks,
  onChange,
  hide = [],
}: {
  game: LiveGameId
  picks: RoomOptions
  onChange: (picks: RoomOptions) => void
  /** Settings that don't apply here (a one-on-one game has no teams). */
  hide?: string[]
}) {
  const options = LIVE_GAMES[game].options.filter((o) => !hide.includes(o.key))
  if (options.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {options.map((o) => (
        <section key={o.key} className="flex flex-col gap-2.5" role="radiogroup" aria-label={o.label}>
          <h3 className="gu-label">{o.label}</h3>
          <div className={cn("grid gap-2.5", o.choices.length === 2 ? "grid-cols-2" : o.choices.length === 4 ? "grid-cols-2" : "grid-cols-3")}>
            {o.choices.map((c) => (
              <GameChoice
                key={String(c.value)}
                role="radio"
                selected={picks[o.key] === c.value}
                onClick={() => onChange({ ...picks, [o.key]: c.value })}
                className="min-h-12 px-2 py-2.5 text-[15px] leading-tight font-bold"
              >
                {c.label}
              </GameChoice>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** A step counter for multi-step flows: ● ● ○ */
export function StepDots({ step, of }: { step: number; of: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 rounded-full transition-all",
            i === step ? "w-6 bg-white" : i < step ? "w-2.5 bg-white/90" : "w-2.5 bg-white/40"
          )}
        />
      ))}
    </span>
  )
}

export const isLiveGameId = (v: string | null | undefined): v is LiveGameId =>
  !!v && (LIVE_GAME_IDS as readonly string[]).includes(v)

