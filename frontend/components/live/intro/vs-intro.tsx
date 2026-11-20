"use client"

import { validLevel } from "@/components/game-avatar/level-badge"
import { LIVE_GAMES } from "@/lib/live/games"
import type { LiveGameId, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { Bolt } from "./bolt"
import { GlossyText } from "./glossy-text"
import { IntroAvatar } from "./intro-avatar"
import { accentOf, clamp, displayName, FADE_MS, useMarks, useViewport } from "./shared"

/**
 * The duel's beats, in ms from mount: everything is in by ~0.95 s, then it
 * holds a good second so both names and the VS can be read, then fades.
 */
export const VS_TIMELINE = {
  /** The red and blue halves slide in. */
  halves: 0,
  title: 180,
  bolt: 240,
  p1: 220,
  p1Land: 600,
  p2: 380,
  p2Land: 760,
  /** VS starts its slam; it hits ~170 ms later (shake, burst). */
  vs: 800,
  names: 760,
  total: 2250 + FADE_MS,
} as const

const SIDES = [
  {
    // Red, from the left
    clip: "polygon(0 0, 57% 0, 43% 100%, 0 100%)",
    bg: "linear-gradient(118deg, #d81e3a 0%, #f2423f 38%, #ff7a52 72%, #ffb070 100%)",
    rim: "#9f1239",
    tint: "#ffd2c4",
  },
  {
    // Blue, from the right
    clip: "polygon(57% 0, 100% 0, 100% 100%, 43% 100%)",
    bg: "linear-gradient(118deg, #8fe3ff 0%, #4cb8ff 30%, #2f86f6 64%, #1d55d6 100%)",
    rim: "#1e3a8a",
    tint: "#cfe7ff",
  },
] as const

/**
 * Two-player intro, a fighting game's VS screen: a diagonal red / blue split,
 * a lightning crackle across, both players' characters in circles sliding in
 * from their sides (each plays its entrance as it lands), a glossy pink VS
 * slamming in between, and the names under them. Seat 0 is red on the left.
 * Same layout as the duel lobby, so the lobby flows into it.
 */
export function VsIntro({
  game,
  players,
  meId,
  reduced,
}: {
  game: LiveGameId
  players: RoomPlayer[]
  meId: string
  reduced: boolean
}) {
  const { w: W, h: H } = useViewport()
  const T = VS_TIMELINE
  // Only the characters mount on cue (they play their entrance as they land);
  // everything else is on screen from the first frame, timed by CSS delays
  const passed = useMarks([T.p1Land, T.p2Land], reduced)

  const size = Math.round(clamp(Math.min(W * 0.27, H * 0.24), 72, 190))
  const spread = Math.min(W * 0.28, 400)
  const cy = H * 0.47
  const vs = Math.round(clamp(Math.min(W * 0.17, H * 0.19), 48, 170))
  const boltH = clamp(size * 0.95, 70, 180)
  const nameFs = Math.round(clamp(size * 0.2, 16, 34))
  const titleFs = Math.round(clamp(Math.min(W * 0.075, H * 0.06), 22, 54))

  return (
    <div className="pi-shake pi-shake-on" style={{ animationDelay: `${T.vs + 170}ms` }}>
      {SIDES.map((s, i) => (
        <div
          key={i}
          className={cn("pi-half", i === 0 ? "pi-in-l" : "pi-in-r")}
          style={{ clipPath: s.clip, background: s.bg, animationDelay: `${T.halves + i * 40}ms`, ["--pi-d" as string]: "300ms" }}
        />
      ))}

      {/* Light streaks drifting across */}
      {[
        [0.18, 0.12, 0.3],
        [0.71, 0.08, 0.7],
        [0.83, 0.16, 0.15],
        [0.3, 0.06, 1.0],
      ].map(([y, w, d], i) => (
        <span
          key={i}
          aria-hidden
          className={cn("pi-dash", i % 2 && "pi-dash-r")}
          style={{ top: `${y * 100}%`, left: `${20 + i * 18}%`, width: `${w * 100}%`, opacity: 0.6, animationDelay: `${-d}s` }}
        />
      ))}

      <div className="pi-down absolute inset-x-0 flex items-center justify-center gap-3" style={{ top: H * 0.1, animationDelay: `${T.title}ms` }}>
        <span aria-hidden className="h-[3px] w-[18vw] max-w-56 rounded-full bg-gradient-to-l from-white/90 to-transparent" />
        <GlossyText size={titleFs} rim="#7a1fa2" tint="#ffd4f4">
          {LIVE_GAMES[game]?.name ?? "Get ready"}
        </GlossyText>
        <span aria-hidden className="h-[3px] w-[18vw] max-w-56 rounded-full bg-gradient-to-r from-white/90 to-transparent" />
      </div>

      <Bolt className="pi-bolt-in absolute inset-x-0" style={{ top: cy - boltH / 2, height: boltH, animationDelay: `${T.bolt}ms` }} />

      {players.slice(0, 2).map((p, i) => {
        const left = i === 0
        const accent = accentOf(p, false)
        const x = W / 2 + (left ? -spread : spread)
        const landed = passed > i
        return (
          <div
            key={p.uid}
            className={cn("absolute", left ? "pi-in-l" : "pi-in-r")}
            style={{ left: x - size / 2, top: cy - size / 2, width: size, ["--pi-d" as string]: "340ms", animationDelay: `${left ? T.p1 : T.p2}ms` }}
          >
            {/* Outer halo ring, the white disc and the character */}
            <span className="pi-ring" style={{ inset: -size * 0.16, animationDelay: `${(left ? T.p1Land : T.p2Land) - 60}ms` }} />
            <div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: size,
                height: size,
                background: `radial-gradient(circle at 50% 35%, color-mix(in oklab, ${accent} 55%, white), ${accent})`,
                boxShadow: "0 0 0 4px #fff, 0 10px 24px rgba(20,6,50,.35)",
              }}
            >
              {landed ? (
                <span className="pi-pop inline-flex">
                  <IntroAvatar player={p} accent={accent} size={size} mode={reduced ? "still" : "intro"} />
                </span>
              ) : null}
            </div>
            <div
              className="pi-up absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
              style={{ top: size + size * 0.28, width: Math.min(W * 0.46, 320), animationDelay: `${T.names + i * 80}ms` }}
            >
              <GlossyText size={nameFs} rim={SIDES[i].rim} tint={SIDES[i].tint}>
                {displayName(p.name)}
              </GlossyText>
              <span className="flex gap-1.5">
                {p.uid === meId ? <span className="pi-you">YOU</span> : null}
                {validLevel(p.level) ? <span className="pi-you pi-lv">LV {validLevel(p.level)}</span> : null}
              </span>
            </div>
          </div>
        )
      })}

      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: cy }}>
        <div className="pi-burst" style={{ width: vs * 2.2, height: vs * 2.2, left: -vs * 0.48, top: -vs * 0.55, animationDelay: `${T.vs + 150}ms` }} />
        <GlossyText size={vs} rim="#ffffff" tint="#e02cb0" top="#ffa6ea" className="pi-slam relative tracking-[-0.04em]" style={{ animationDelay: `${T.vs}ms` }}>
          VS
        </GlossyText>
      </div>
    </div>
  )
}
