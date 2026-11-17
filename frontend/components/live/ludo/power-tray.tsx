"use client"

import * as React from "react"

import {
  isExpired,
  POWER_INFO,
  POWER_TTL_MS,
  type HeldPower,
  type LudoSignature,
  type PowerKind,
} from "@/lib/live/ludo"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { PlayerAvatar } from "../player-avatar"
import { POWER_COLOUR, PowerBadge } from "./power-art"

/** Green → amber → red for the share of time left. */
const timeColour = (share: number) => `hsl(${Math.round(120 * share)} 85% 48%)`
const RING_R = 13
const RING_C = 2 * Math.PI * RING_R
/** Hold a power this long (touch) to see its time left. */
const PEEK_MS = 450

/** 95 s → "1:35". */
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/**
 * Power Ludo: your powers, under the board. The character's signature power
 * first (its own look: your character with the power's badge, "once per
 * game", a glow; greyed once used), then the power-ups you picked up, each
 * with a ring that empties over POWER_TTL_MS — hover or hold one for the time
 * left; it shrinks away when it runs out.
 */
export function PowerTray({
  me,
  characterName,
  signature,
  held,
  now,
  aiming,
  canUse,
  onPick,
}: {
  me: RoomPlayer
  /** The equipped character's name ("Zenko"). */
  characterName?: string
  signature?: LudoSignature
  held: HeldPower[]
  /** Server ms (ticks once a second). */
  now: number
  /** The power being aimed: which one, and whether it's the signature. */
  aiming: { kind: PowerKind; sig: boolean } | null
  canUse: boolean
  onPick: (kind: PowerKind, sig: boolean) => void
}) {
  // Narrow screens: with several chips the power-ups show just their badge
  const crowded = held.length + (signature ? 1 : 0) > 2
  return (
    <div className="mb-1 flex min-h-8 items-center justify-center gap-1.5" role="group" aria-label="Your powers">
      {signature && (
        <SignatureChip
          me={me}
          characterName={characterName}
          signature={signature}
          aiming={!!aiming?.sig}
          canUse={canUse}
          onPick={() => onPick(signature.kind, true)}
        />
      )}
      {held.length === 0 ? (
        <span className="truncate text-[11px] text-white/60">
          {signature ? "Glowing squares give more" : "Land on a glowing square to grab a power"}
        </span>
      ) : (
        held.map((h, i) => (
          <HeldChip
            key={`${h.kind}${h.until}${i}`}
            power={h}
            now={now}
            aiming={!!aiming && !aiming.sig && aiming.kind === h.kind}
            canUse={canUse}
            crowded={crowded}
            onPick={() => onPick(h.kind, false)}
          />
        ))
      )}
    </div>
  )
}

/** The character's own power: once per game, never fizzles out. */
function SignatureChip({
  me,
  characterName,
  signature,
  aiming,
  canUse,
  onPick,
}: {
  me: RoomPlayer
  characterName?: string
  signature: LudoSignature
  aiming: boolean
  canUse: boolean
  onPick: () => void
}) {
  const { kind, used } = signature
  const info = POWER_INFO[kind]
  const colour = POWER_COLOUR[kind]
  const owner = characterName ? `${characterName}'s ` : ""
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={used}
      title={used ? `${owner}${info.name} — used` : `${owner}${info.name}: ${info.blurb}. Once per game.`}
      aria-label={used ? `${owner}${info.name}, used` : `${owner}${info.name}, signature power, once per game`}
      className={cn(
        "relative flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-0.5 text-left transition-[transform,opacity,filter] active:scale-95",
        used ? "opacity-45 grayscale" : !canUse && "opacity-75"
      )}
      style={{
        background: used
          ? "rgb(255 255 255 / 0.1)"
          : `linear-gradient(90deg, color-mix(in oklab, ${colour} 55%, transparent), rgb(255 255 255 / ${aiming ? 0.3 : 0.12}))`,
        // A gold edge and the power's glow; aiming it: a white ring, like the power-ups
        boxShadow: used
          ? undefined
          : `0 0 0 ${aiming ? "2px #fff" : "1px rgb(253 224 71 / 0.85)"}, 0 0 12px 1px ${colour}`,
      }}
    >
      {/* A soft glow that breathes while it's still yours to use */}
      {!used && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse rounded-full"
          style={{ boxShadow: `0 0 10px 2px ${colour}` }}
        />
      )}
      <span className="relative size-7 shrink-0">
        <PlayerAvatar player={me} size={28} frame={false} />
        <PowerBadge kind={kind} className="absolute -right-1 -bottom-1 size-4 ring-1 ring-white/80 rounded-full" />
      </span>
      <span className="relative flex min-w-0 flex-col leading-none">
        <span className="truncate text-[11px] font-bold">{info.name}</span>
        <span className="mt-0.5 truncate text-[9px] font-semibold tracking-wide text-yellow-200/90 uppercase">
          {used ? "Used" : "Once per game"}
        </span>
      </span>
    </button>
  )
}

/** A power-up from the track, with its ring running down. */
function HeldChip({
  power,
  now,
  aiming,
  canUse,
  crowded,
  onPick,
}: {
  power: HeldPower
  now: number
  aiming: boolean
  canUse: boolean
  crowded: boolean
  onPick: () => void
}) {
  const { kind, until } = power
  const info = POWER_INFO[kind]
  const timed = until > 0
  const left = timed ? until - now : POWER_TTL_MS
  const share = Math.max(0, Math.min(1, left / POWER_TTL_MS))
  const gone = timed && isExpired(power, now)

  // Touch: hold to peek at the time left (and don't fire the power on release)
  const [peek, setPeek] = React.useState(false)
  const timer = React.useRef<number | null>(null)
  const held = React.useRef(false)
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    setPeek(false)
  }
  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  return (
    <button
      type="button"
      onClick={() => {
        if (held.current) {
          held.current = false
          return
        }
        onPick()
      }}
      onPointerDown={(e) => {
        held.current = false
        if (e.pointerType === "mouse" || !timed) return
        timer.current = window.setTimeout(() => {
          held.current = true
          setPeek(true)
        }, PEEK_MS)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      disabled={gone}
      title={timed ? `${info.name}: ${info.blurb} · ${mmss(left)} left` : `${info.name}: ${info.blurb}`}
      aria-label={timed ? `${info.name}, ${mmss(left)} left` : info.name}
      className={cn(
        "group relative flex h-8 shrink-0 touch-manipulation items-center gap-1 rounded-full bg-white/12 pr-2.5 pl-0.5 text-[11px] font-semibold transition-[background-color,transform,opacity,filter] select-none active:scale-95",
        crowded && "max-[400px]:pr-0.5",
        aiming && "bg-white/30 ring-2 ring-white",
        !canUse && "opacity-60",
        // Ran out: it shrinks and fades away until the state drops it
        gone && "scale-50 opacity-0 grayscale duration-700"
      )}
    >
      <span className="relative flex size-7 shrink-0 items-center justify-center">
        {timed && (
          <svg viewBox="0 0 30 30" className="absolute inset-0 size-7 -rotate-90" aria-hidden>
            <circle cx="15" cy="15" r={RING_R} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="2.5" />
            <circle
              cx="15"
              cy="15"
              r={RING_R}
              fill="none"
              stroke={timeColour(share)}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - share)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 1s linear" }}
            />
          </svg>
        )}
        <PowerBadge kind={kind} className={timed ? "size-5" : "size-6"} />
      </span>
      <span className={cn(crowded && "max-[400px]:hidden")}>{info.name}</span>
      {/* Time left: on hover (mouse) or a long press (touch); red in the last 20 s */}
      {timed && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-bold tabular-nums opacity-0 shadow transition-opacity group-hover:opacity-100",
            peek && "opacity-100",
            left <= 20_000 ? "text-red-300" : "text-white"
          )}
        >
          {mmss(left)}
        </span>
      )}
    </button>
  )
}
