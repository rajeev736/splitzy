"use client"

import type * as React from "react"

import { winsNeeded, type MemoryState } from "@/lib/live/memory"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { PlayerAvatar } from "../player-avatar"

/** Seat colours (lib/live/room SEAT_COLOURS: red, green, yellow, blue, purple). */
const SEAT_HEX = ["#ff5a6a", "#2fc46b", "#ffb21f", "#3d8bff", "#a968ff"]
export const colourOf = (p: RoomPlayer | undefined) => SEAT_HEX[(p?.seat ?? 0) % SEAT_HEX.length]
export const firstName = (p: RoomPlayer | undefined) => (p ? p.name.split(" ")[0] : "Someone")

/** A player along the top: avatar (a turn-timer ring round whoever's up), pairs found, round wins. */
export function PlayerChip({
  player,
  you,
  pairs,
  wins,
  need,
  active,
  left,
  ring,
}: {
  player: RoomPlayer | undefined
  you: boolean
  pairs: number
  wins: number
  /** Round wins to take the match (0: a single round, no stars). */
  need: number
  active: boolean
  left: boolean
  /** Turn time left, 1 → 0 (null: not their turn). */
  ring: number | null
}) {
  const colour = colourOf(player)
  const AV = 34
  const R = 21
  const C = 2 * Math.PI * R
  return (
    <div
      className={cn("mt-chip", active && "mt-chip-on", left && "opacity-55 grayscale")}
      style={{ "--mt-c": colour } as React.CSSProperties}
    >
      <span className="relative flex size-[46px] shrink-0 items-center justify-center">
        <svg viewBox="0 0 46 46" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="23" cy="23" r={R} fill="none" stroke={active ? "rgba(255,255,255,.55)" : colour} strokeOpacity={active ? 1 : 0.55} strokeWidth="3" />
          {ring !== null && (
            <circle
              cx="23"
              cy="23"
              r={R}
              fill="none"
              stroke={ring < 0.25 ? "#ff4d5e" : colour}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - ring)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke .3s" }}
            />
          )}
        </svg>
        <PlayerAvatar player={player} size={AV} frame={false} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] leading-tight font-extrabold">{you ? "You" : firstName(player)}</span>
        <span className="mt-1 flex items-center gap-1">
          <span className="mt-pairs" title="Pairs this round">
            <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
              <rect x="1" y="3" width="8" height="10" rx="2" fill="currentColor" opacity=".55" />
              <rect x="6" y="2" width="8" height="10" rx="2" fill="currentColor" />
            </svg>
            {pairs}
          </span>
          {need > 0 &&
            Array.from({ length: need }, (_, i) => (
              <svg key={i} viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                <path
                  d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"
                  fill={i < wins ? "#ffc62b" : "rgba(43,35,80,.18)"}
                  stroke={i < wins ? "#c98a00" : "none"}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            ))}
          {left && <span className="text-[10px] font-bold opacity-80">left</span>}
        </span>
      </span>
    </div>
  )
}

/** The board's cleared: who took the round, and the next one coming. */
export function RoundOver({
  s,
  byId,
  uid,
  secondsLeft,
}: {
  s: MemoryState
  byId: Record<string, RoomPlayer>
  uid: string
  secondsLeft: number
}) {
  const winners = s.lastWinners
  const last = s.round >= s.rounds || s.players.some((p) => (s.wins[p] ?? 0) >= winsNeeded(s.rounds))
  const title =
    winners.length === 0
      ? "Nobody took this round"
      : winners.length > 1
        ? "A shared round!"
        : winners[0] === uid
          ? "You won the round!"
          : `${firstName(byId[winners[0]])} won the round!`
  const ranked = [...s.players].sort((a, b) => (s.pairs[b] ?? 0) - (s.pairs[a] ?? 0))
  return (
    <div className="mt-scrim absolute inset-0 z-10 flex items-center justify-center rounded-[22px] p-3">
      <div className="gu-panel mt-roundover w-full max-w-[300px] px-4 pt-4 pb-3 text-center text-[var(--gu-ink,#2b2350)]">
        <p className="gu-label">{s.rounds > 1 ? `Round ${s.round} of ${s.rounds}` : "Round over"}</p>
        <p className="mt-1 text-lg leading-tight font-extrabold">{title}</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {ranked.map((p) => (
            <div key={p} className="flex items-center gap-2 rounded-xl bg-black/[.04] px-2 py-1">
              <PlayerAvatar player={byId[p]} size={28} frame={false} peek={false} />
              <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">{p === uid ? "You" : firstName(byId[p])}</span>
              {winners.includes(p) && <span aria-label="won the round">👑</span>}
              <span className="text-sm font-extrabold tabular-nums">
                {s.pairs[p] ?? 0} {(s.pairs[p] ?? 0) === 1 ? "pair" : "pairs"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-bold opacity-70">
          {last ? "Final results coming up…" : `Next round in ${secondsLeft}…`}
        </p>
      </div>
    </div>
  )
}

export const STAGE_CSS = `
.mt-pill{display:inline-flex;align-items:center;height:26px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.88);color:#3a2e78;font-size:12px;font-weight:800;letter-spacing:.01em;box-shadow:inset 0 -2px 0 rgba(90,60,196,.22),0 2px 6px rgba(40,30,120,.18)}
.mt-chip{display:flex;align-items:center;gap:6px;min-width:0;padding:4px 8px 4px 4px;border-radius:16px;background:rgba(255,255,255,.86);color:#2b2350;box-shadow:inset 0 -3px 0 rgba(90,60,196,.18),0 3px 8px rgba(40,30,120,.16);transition:transform .25s,box-shadow .25s,background .25s}
.mt-chip-on{background:#fff;transform:translateY(-1px);box-shadow:inset 0 -3px 0 var(--mt-c),0 0 0 2.5px var(--mt-c),0 0 18px 2px color-mix(in srgb,var(--mt-c) 70%,transparent)}
.mt-pairs{display:inline-flex;align-items:center;gap:2px;padding:0 5px;height:16px;border-radius:999px;background:var(--mt-c);color:#fff;font-size:11px;font-weight:800;font-variant-numeric:tabular-nums}
.mt-board{display:grid;border-radius:22px;background:rgba(255,255,255,.18);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35),0 10px 28px rgba(40,30,120,.18)}
.mt-status{display:flex;align-items:center;justify-content:center;min-height:36px;padding:4px 14px;border-radius:999px;background:rgba(43,35,100,.32);font-size:14px;font-weight:800;text-align:center;text-shadow:0 1px 0 rgba(30,20,90,.35);transition:background .25s}
.mt-status-turn{background:linear-gradient(180deg,#ffcd3c,#ffa62b);color:#5a2d00;text-shadow:none;box-shadow:inset 0 -3px 0 rgba(160,80,0,.35)}
.mt-scrim{background:rgba(50,30,130,.24);animation:mt-fade .25s both}
.mt-roundover{animation:mt-in .35s cubic-bezier(.3,1.4,.5,1) both}
@keyframes mt-fade{from{opacity:0}}
@keyframes mt-in{from{opacity:0;transform:scale(.85) translateY(10px)}}
@media (max-width:380px){.mt-chip{padding-right:4px}}
`
