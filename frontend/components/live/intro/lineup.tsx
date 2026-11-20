"use client"

import type * as React from "react"

import { validLevel } from "@/components/game-avatar/level-badge"
import { TEAM_NAMES, teamOfSeat } from "@/lib/live/seats"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { GlossyText } from "./glossy-text"
import { IntroAvatar } from "./intro-avatar"
import { accentOf, clamp, displayName, useViewport } from "./shared"

/**
 * Who's playing, in the middle of the match splash. Two players: avatar – VS –
 * avatar, sliding in from their sides with the VS popping in between. Ludo
 * 2v2: the two teams the same way. More players: a row (or two) of avatars
 * popping in one after another. Transforms / opacity only (see SPLASH_CSS).
 * Colours: `rim` for the names' outline and the tags.
 */
export function MatchLineup({
  players,
  meId,
  teams,
  reduced,
  rim,
  tint,
}: {
  /** Seat order, players who left already removed. */
  players: RoomPlayer[]
  meId: string
  teams: boolean
  reduced: boolean
  rim: string
  tint: string
}) {
  const { w: W, h: H } = useViewport()
  const mode = reduced ? "still" : "intro"
  const n = players.length

  if (teams && n === 4) {
    const vs = Math.round(clamp(Math.min(W * 0.11, H * 0.07), 34, 72))
    // Four columns (avatar + 8px) in two teams, the VS and the gaps, inside the page padding
    const perPlayer = (Math.min(W, 760) - 32 - vs - 16 - 20) / 4
    const size = Math.round(clamp(Math.min(perPlayer - 8, H * 0.13), 40, 112))
    const side = (t: 0 | 1) => (
      <div
        className={cn("flex flex-col items-center gap-2", t ? "sp-in-r" : "sp-in-l")}
        style={{ animationDelay: `${t ? 140 : 60}ms` }}
      >
        <span className={cn("sp-tag", t ? "sp-team-b" : "sp-team-a")}>{TEAM_NAMES[t].toUpperCase()}</span>
        <div className="flex items-start gap-2.5">
          {players
            .filter((p) => teamOfSeat(p.seat) === t)
            .map((p) => (
              <Player key={p.uid} p={p} meId={meId} size={size} teams mode={mode} rim={rim} tint={tint} W={W} />
            ))}
        </div>
      </div>
    )
    return (
      <div className="flex items-center justify-center gap-2">
        {side(0)}
        <Vs size={vs} rim={rim} />
        {side(1)}
      </div>
    )
  }

  if (n === 2) {
    const size = Math.round(clamp(Math.min(W * 0.26, H * 0.17), 64, 150))
    const vs = Math.round(clamp(size * 0.55, 38, 84))
    return (
      <div className="flex items-start justify-center" style={{ gap: clamp(W * 0.04, 8, 40) }}>
        {players.map((p, i) => (
          <div key={p.uid} className={i ? "sp-in-r" : "sp-in-l"} style={{ animationDelay: `${i ? 140 : 60}ms`, order: i * 2 }}>
            <Player p={p} meId={meId} size={size} mode={mode} rim={rim} tint={tint} W={W} wide />
          </div>
        ))}
        <div className="flex items-center" style={{ height: size, order: 1 }}>
          <Vs size={vs} rim={rim} />
        </div>
      </div>
    )
  }

  // 3–8 players: one row when it fits, else two balanced rows
  const cols = n <= 4 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / cols)
  const size = Math.round(clamp(Math.min(((Math.min(W, 760) - 32) / cols) * 0.6, ((H * 0.36) / rows) * 0.6), 44, 120))
  return (
    <div className="flex flex-col items-center gap-4">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex justify-center gap-3">
          {players.slice(r * cols, r * cols + cols).map((p, j) => (
            <div key={p.uid} className="sp-pop" style={{ animationDelay: `${80 + (r * cols + j) * 70}ms` }}>
              <Player p={p} meId={meId} size={size} mode={mode} rim={rim} tint={tint} W={W} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Vs({ size, rim }: { size: number; rim: string }) {
  return (
    <GlossyText size={size} rim={rim} tint="#ffcf3a" top="#fff6c8" className="sp-pop tracking-[-0.04em]" style={{ animationDelay: "420ms" }}>
      VS
    </GlossyText>
  )
}

/** An avatar on a white-ringed disc, the name under it, and the YOU / level tags. */
function Player({
  p,
  meId,
  size,
  teams = false,
  mode,
  rim,
  tint,
  W,
  wide = false,
}: {
  p: RoomPlayer
  meId: string
  size: number
  teams?: boolean
  mode: "still" | "intro"
  rim: string
  tint: string
  W: number
  /** Duel: room for a bigger name. */
  wide?: boolean
}) {
  const accent = accentOf(p, teams)
  const level = validLevel(p.level)
  const width = wide ? Math.min(W * 0.36, 240) : size + 8
  const name = wide ? displayName(p.name) : displayName(p.name).split(" ")[0]
  // Big, but never wider than its column (the rim adds ~0.4em)
  const nameFs = Math.round(clamp(Math.min(size * (wide ? 0.21 : 0.24), width / (name.length * 0.62 + 0.4)), 11, 30))
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width }}>
      <div
        className="sp-disc"
        style={
          {
            width: size,
            height: size,
            background: `radial-gradient(circle at 50% 35%, color-mix(in oklab, ${accent} 50%, white), ${accent})`,
            boxShadow: "0 0 0 4px #fff, 0 8px 18px rgba(30,20,70,.22)",
          } as React.CSSProperties
        }
      >
        <IntroAvatar player={p} accent={accent} size={size} mode={mode} />
      </div>
      <span className="mt-1 max-w-full">
        <GlossyText size={nameFs} rim={rim} tint={tint}>
          {name}
        </GlossyText>
      </span>
      {p.uid === meId || level ? (
        <span className="sp-up flex flex-wrap justify-center gap-1" style={{ animationDelay: "480ms" }}>
          {p.uid === meId ? <span className="sp-tag">YOU</span> : null}
          {level ? <span className="sp-tag sp-tag-lv">LV {level}</span> : null}
        </span>
      ) : null}
    </div>
  )
}
