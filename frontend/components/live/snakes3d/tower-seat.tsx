"use client"

import * as React from "react"

import { UserAvatar } from "@/components/shared/user-avatar"
import { ordinal, SNAKES_MAX_MISSED, type SnakesPlayer } from "@/lib/live/snakes"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { TOKEN_COLOURS } from "../ludo/ludo-board"

/** Ring colour for the share of time left: green → amber → red. */
const timeColour = (share: number) => `hsl(${Math.round(120 * share)} 85% 48%)`
const RING_R = 25
const RING_C = 2 * Math.PI * RING_R

/**
 * A player at the tower — the Ludo seat (photo, timer ring, colour dot,
 * missed turns, dice beside it) with a Snakes status: their square.
 */
export function TowerSeat({
  player,
  piece,
  isTurn,
  isMe,
  countdown,
  align,
  dice,
  onTap,
  compact = false,
}: {
  player: RoomPlayer
  piece: SnakesPlayer
  isTurn: boolean
  isMe: boolean
  /** 1 → 0 share of the decision time left, while a timer runs for them. */
  countdown: number | null
  align: "left" | "right"
  dice?: React.ReactNode
  /** Opens the throw picker (other players only). */
  onTap?: () => void
  /** Three to a row: the dice takes room only while it's showing. */
  compact?: boolean
}) {
  const colour = TOKEN_COLOURS[piece.colour]
  const out = !!piece.out
  const dim = player.left || out || !player.online
  const missed = piece.missed ?? 0
  // Three to a row (or missed-turn dots beside it) leaves little room: shorter words
  const short = compact || missed > 0
  const status =
    piece.place > 0
      ? short
        ? ordinal(piece.place)
        : `${ordinal(piece.place)} · finished`
      : out
        ? "Out"
        : player.left
          ? "Left"
          : !player.online
            ? "Offline"
            : piece.pos === 0
              ? short
                ? "Gate"
                : "At the gate"
              : short
                ? `Sq ${piece.pos}`
                : `Square ${piece.pos}`
  // Two to a row on the smallest phones: the long words give way to the short ones
  const longStatus =
    !short && piece.place === 0 && !out && !player.left && player.online
      ? piece.pos === 0
        ? { long: "At the gate", short: "Gate" }
        : { long: `Square ${piece.pos}`, short: `Sq ${piece.pos}` }
      : null
  const share = countdown ?? 1
  const missedDots = missed > 0 && !out && (
    <span className="flex gap-0.5" aria-label={`Missed ${missed} of ${SNAKES_MAX_MISSED} turns`}>
      {Array.from({ length: SNAKES_MAX_MISSED }, (_, i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i < missed ? "bg-red-400" : "bg-white/30")} />
      ))}
    </span>
  )
  const photo = (
    <button
      type="button"
      data-throw-anchor={player.uid}
      onClick={onTap}
      disabled={!onTap}
      aria-label={onTap ? `Throw something at ${player.name}` : player.name}
      className={cn("relative shrink-0 rounded-full transition-transform enabled:active:scale-95", compact ? "size-11" : "size-14 @max-[10rem]:size-11")}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={RING_R} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={RING_R}
          fill="none"
          stroke={countdown !== null ? timeColour(share) : colour}
          strokeOpacity={countdown !== null || isTurn ? 1 : 0.85}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={countdown !== null ? RING_C * (1 - share) : 0}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 1s linear" }}
        />
      </svg>
      <UserAvatar
        src={player.photo}
        name={player.name}
        size="md"
        className={cn("absolute", compact ? "inset-[5.5px] size-[33px]" : "inset-[7px] size-[42px] @max-[10rem]:inset-[5.5px] @max-[10rem]:size-[33px]")}
      />
      <span
        className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-2 ring-[#0d2463]"
        style={{ backgroundColor: colour }}
        aria-label={`${piece.colour} piece`}
      />
      {isTurn && <span aria-hidden className="absolute -inset-1 rounded-full" style={{ boxShadow: `0 0 16px 2px ${colour}` }} />}
    </button>
  )
  const first = isMe ? "You" : player.name.split(" ")[0]

  if (compact) {
    // Three to a row: photo on top (the dice tucked at its shoulder), name and square below
    return (
      <div className={cn("flex min-w-0 flex-col items-center gap-0.5 text-center", dim && "opacity-60")}>
        <div className="relative">
          {photo}
          {dice && <div className="absolute -top-1 -right-8 flex size-8 items-center justify-center">{dice}</div>}
        </div>
        <p className="w-full truncate text-[11px] leading-tight font-semibold">{first}</p>
        <p className="flex w-full items-center justify-center gap-1 text-[10px] leading-tight text-white/70">
          <span className="truncate">{status}</span>
          {missedDots}
        </p>
      </div>
    )
  }
  // A container: on a narrow seat (the smallest phones) the photo and dice shrink so the name still fits
  return (
    <div className="@container min-w-0">
      <div className={cn("flex min-w-0 items-center gap-1.5 @max-[10rem]:gap-1", align === "right" && "flex-row-reverse", dim && "opacity-60")}>
        {photo}
        <div className="flex size-10 shrink-0 items-center justify-center @max-[10rem]:size-8">{dice}</div>
        <div className={cn("min-w-0 flex-1 leading-tight", align === "right" && "text-right")}>
          <p className="truncate text-xs font-semibold">{first}</p>
          <p className="flex items-center gap-1 text-[10px] text-white/70" style={{ justifyContent: align === "right" ? "flex-end" : undefined }}>
            {longStatus ? (
              <>
                <span className="truncate @max-[10rem]:hidden">{longStatus.long}</span>
                <span className="hidden truncate @max-[10rem]:inline">{longStatus.short}</span>
              </>
            ) : (
              <span className="truncate">{status}</span>
            )}
            {missedDots}
          </p>
        </div>
      </div>
    </div>
  )
}
