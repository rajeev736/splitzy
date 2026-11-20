"use client"

import type * as React from "react"

import { hasFrame } from "@/components/fun/frame-art"
import { validLevel } from "@/components/game-avatar/level-badge"
import { TEAM_NAMES, teamOfSeat } from "@/lib/live/seats"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { Bolt } from "./bolt"
import { GlossyText } from "./glossy-text"
import { IntroAvatar } from "./intro-avatar"
import { patternFor } from "./patterns"
import { accentOf, clamp, displayName, FADE_MS, useMarks, useViewport } from "./shared"

/** First band starts moving. */
const START_MS = 60
/** One band's slide in. */
const ENTER_MS = 380
/** Between two bands' starts, at most (fewer when many players, to fit the budget). */
const STEP_MS = 340
/** Everyone in: long enough to read every name before the fade. */
const HOLD_MS = 950
/** 2v2: the VS slam after the last band. */
const VS_MS = 260
/** The whole intro, fade included, never longer than this. */
const BUDGET_MS = 3000

/** When each band lands (ms from mount), the VS slam (2v2) and the total, fade included. */
export function bandTimeline(n: number, teams: boolean) {
  const extra = teams ? VS_MS : 0
  const step = n > 1 ? Math.min(STEP_MS, (BUDGET_MS - START_MS - ENTER_MS - HOLD_MS - FADE_MS - extra) / (n - 1)) : 0
  const starts = Array.from({ length: n }, (_, i) => Math.round(START_MS + i * step))
  const lands = starts.map((s) => s + ENTER_MS)
  const last = lands[n - 1] ?? START_MS
  return { starts, lands, vs: last, total: last + extra + HOLD_MS + FADE_MS }
}

const rimOf = (a: string) => `color-mix(in oklab, ${a} 56%, #12072e)`
const tintOf = (a: string) => `color-mix(in oklab, ${a} 30%, white)`

/**
 * Multi-player intro: full-screen slanted colour bands stacked top to bottom,
 * one per player in the order given (seat order; 2v2 sorted by team), sliding
 * in one after another from alternate sides. Each carries the player's name in big glossy type and their
 * character, which plays its entrance as the band lands. 2v2 shows the teams
 * on the two halves with a lightning seam and a VS.
 */
export function BandIntro({
  players,
  meId,
  teams,
  reduced,
}: {
  players: RoomPlayer[]
  meId: string
  teams: boolean
  reduced: boolean
}) {
  const { w: W, h: H } = useViewport()
  const n = players.length
  const tl = bandTimeline(n, teams)
  const passed = useMarks(teams ? [...tl.lands, tl.vs] : tl.lands, reduced)
  const vsIn = teams && passed > n

  const bh = H / n
  const slant = Math.min(W * 0.065, bh * 0.22)
  const mid = n / 2
  /** Boundary k's y at the left and right edges (k = 0 / n: past the screen). */
  const edge = (k: number): [number, number] => {
    if (k <= 0) return [-40, -40]
    if (k >= n) return [H + 40, H + 40]
    const y = k * bh
    const s = teams && k === mid ? 0 : k % 2 ? slant : -slant
    return [y - s, y + s]
  }
  /** Half the dark seam between two bands (the teams' seam is wider). */
  const seam = (k: number) => (k <= 0 || k >= n ? 0 : teams && k === mid ? 7 : 2.5)

  const colW = Math.min(W, 780)
  const col0 = (W - colW) / 2
  const pad = clamp(W * 0.04, 12, 32)

  return (
    <div className={cn("pi-shake", vsIn && "pi-shake-on")} style={{ animationDelay: "150ms" }}>
      {players.map((p, i) => {
        const [tl0, tr0] = edge(i)
        const [bl0, br0] = edge(i + 1)
        const top = Math.min(tl0, tr0)
        const height = Math.max(bl0, br0) - top
        const clip = `polygon(0 ${tl0 - top + seam(i)}px, 100% ${tr0 - top + seam(i)}px, 100% ${br0 - top - seam(i + 1)}px, 0 ${bl0 - top - seam(i + 1)}px)`
        const cy = (i + 0.5) * bh - top

        const fromLeft = i % 2 === 0
        const avatarRight = i % 2 === 0
        const accent = accentOf(p, teams)
        const framed = hasFrame(p.frame)
        const base = Math.min(bh * 0.84, colW * 0.36, 230)
        const size = Math.round(framed ? base * 0.68 : base)
        const box = framed ? size * 1.5 : size
        const avatarCx = avatarRight ? col0 + colW - pad - box / 2 : col0 + pad + box / 2

        const name = displayName(p.name)
        const avail = colW - pad * 3 - box
        const fs = Math.round(clamp(Math.min(bh * 0.34, avail / (Math.max(name.length, 4) * 0.6)), 16, 80))
        const landed = passed > i
        const level = validLevel(p.level)

        return (
          <div
            key={p.uid}
            className={cn("pi-band", fromLeft ? "pi-in-l" : "pi-in-r")}
            style={{ top, width: W, height, zIndex: i + 1, animationDelay: `${tl.starts[i]}ms` } as React.CSSProperties}
          >
            <div
              className="pi-band-bg"
              style={{
                clipPath: clip,
                background: `radial-gradient(${box * 1.2}px ${bh * 0.9}px at ${avatarCx}px ${cy}px, color-mix(in oklab, ${accent} 55%, white) 0%, transparent 100%), linear-gradient(172deg, color-mix(in oklab, ${accent} 80%, white) 0%, ${accent} 50%, color-mix(in oklab, ${accent} 76%, black) 100%)`,
              }}
            >
              <div className="pi-pattern" style={{ backgroundImage: patternFor(p.seat) }} />
              <div className="pi-sheen" style={{ animationDelay: `${tl.lands[i] - 80}ms` }} />
            </div>

            <div
              className={cn("absolute flex items-center", avatarRight ? "flex-row" : "flex-row-reverse")}
              style={{ left: col0, width: colW, top: cy - bh / 2, height: bh, paddingInline: pad, gap: pad }}
            >
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
                <GlossyText
                  size={fs}
                  rim={rimOf(accent)}
                  tint={tintOf(accent)}
                  className={fromLeft ? "pi-name-l" : "pi-name-r"}
                  style={{ animationDelay: `${tl.starts[i] + 90}ms` }}
                >
                  {name}
                </GlossyText>
                {(teams || p.uid === meId || level) && bh > 70 ? (
                  <span className="pi-up flex gap-1.5" style={{ animationDelay: `${tl.lands[i]}ms` }}>
                    {teams ? (
                      <span className={cn("pi-you", teamOfSeat(p.seat) ? "pi-team-b" : "pi-team-a")}>
                        {TEAM_NAMES[teamOfSeat(p.seat)].toUpperCase()}
                      </span>
                    ) : null}
                    {p.uid === meId ? <span className="pi-you">YOU</span> : null}
                    {level ? <span className="pi-you pi-lv">LV {level}</span> : null}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center justify-center" style={{ width: box, height: box }}>
                {landed ? (
                  <span className="pi-pop inline-flex drop-shadow-[0_6px_10px_rgba(10,4,30,0.3)]">
                    <IntroAvatar
                      player={p}
                      accent={accent}
                      size={size}
                      mode={reduced ? "still" : "intro"}
                      className="rounded-full ring-[3px] ring-white/85"
                    />
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}

      {teams && vsIn ? <TeamsVs H={H} bh={bh} /> : null}
    </div>
  )
}

/** 2v2: the crackle along the seam between the halves, and the VS. */
function TeamsVs({ H, bh }: { H: number; bh: number }) {
  const vs = Math.round(clamp(bh * 0.4, 40, 100))
  const boltH = clamp(bh * 0.42, 40, 110)
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 50 }}>
      <Bolt className="pi-bolt-in absolute inset-x-0" style={{ top: H / 2 - boltH / 2, height: boltH }} />
      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: H / 2 }}>
        <div className="pi-burst" style={{ width: vs * 2, height: vs * 2, left: -vs * 0.4, top: -vs * 0.45, animationDelay: "120ms" }} />
        <GlossyText size={vs} rim="#ffffff" tint="#e52fb4" top="#ff9be6" className="pi-slam relative">
          VS
        </GlossyText>
      </div>
    </div>
  )
}
