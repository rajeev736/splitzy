"use client"

import * as React from "react"
import { Add01Icon, Cancel01Icon, CrownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { LevelBadge, validLevel } from "@/components/game-avatar/level-badge"
import { TOKEN_COLOURS } from "@/components/live/ludo/ludo-board"
import { SEAT_COLOURS } from "@/lib/live/room"
import {
  benchedPlayer,
  benchSeat,
  canMoveTo,
  freeSeats,
  isTeamRoom,
  playerInSeat,
  TEAM_NAMES,
  teamOfSeat,
  teamSeats,
  type TeamIndex,
} from "@/lib/live/seats"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { LobbyBackdrop } from "./backdrops"
import { Gloss } from "./lobby-styles"
import { useBoxSize } from "./use-box-size"

/** Banner colours by seat: the board games use their piece colour, the others a bright set. */
const BRIGHT = [
  "#e8473b",
  "#2f7cf6",
  "#f2a812",
  "#2fa84f",
  "#d23ba6",
  "#8b5cf6",
  "#0ea5a4",
  "#f97316",
]
function seatTone(meta: RoomMeta, seat: number) {
  if (
    meta.game === "ludo" ||
    meta.game === "snakes" ||
    meta.game === "snakes3d"
  )
    return TOKEN_COLOURS[SEAT_COLOURS[seat % SEAT_COLOURS.length]]
  return BRIGHT[seat % BRIGHT.length]
}
/** Team banners: A warm (red + yellow pieces), B green (green + blue pieces). */
const TEAM_TONES: Record<
  TeamIndex,
  { tone: string; rim: string; tint: string }
> = {
  0: { tone: "#e0453a", rim: "#8a1626", tint: "#ffd2c4" },
  1: { tone: "#22a06b", rim: "#0b5a3b", tint: "#c9f5df" },
}

/** Seats per row: one row when it fits, else balanced rows (5 → 3 + 2). */
function rowsOf(n: number, wide: boolean): number[] {
  if (n <= 3 || (wide && n <= 5)) return [n]
  const top = Math.ceil(n / 2)
  return [top, n - top]
}

export interface PartySceneProps {
  meta: RoomMeta
  players: RoomPlayer[]
  uid: string
  canKick: boolean
  onKick: (p: RoomPlayer) => void
  onInvite: () => void
  /** Team rooms: move to a free seat or the bench. */
  onMove: (seat: number) => void
  /** A move is on its way. */
  moving: boolean
  /** Hint + start button, under the seats. */
  children?: React.ReactNode
}

/**
 * The lobby of the multi-player games: the game's own room (see backdrops)
 * with a banner per seat — the player's character, name and host / you tags,
 * or an open seat to tap and invite someone. Ludo teams get two big team
 * banners facing each other across a VS, and a bench for swapping sides.
 */
export function PartyScene(props: PartySceneProps) {
  const { meta, players } = props
  const [ref, { w }] = useBoxSize<HTMLDivElement>()
  const seated = players.filter(
    (p) => !p.left && p.seat < meta.maxPlayers
  ).length
  const chips = optionChips(meta)
  return (
    <div className="absolute inset-0 overflow-hidden">
      <LobbyBackdrop game={meta.game} />
      <div
        ref={ref}
        className="relative no-scrollbar flex h-full flex-col items-center justify-center gap-3 overflow-y-auto px-3 pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:gap-5 lg:pr-[22rem]"
      >
        <div className="lb-fade-up flex flex-col items-center gap-1.5">
          <span className="lb-glass lb-font rounded-full px-3 py-1 text-xs font-extrabold tracking-wide">
            {seated}/{meta.maxPlayers} players
          </span>
          {chips.length > 0 && (
            <span className="flex flex-wrap justify-center gap-1">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white/85"
                >
                  {c}
                </span>
              ))}
            </span>
          )}
        </div>
        {isTeamRoom(meta) ? (
          <TeamSeats {...props} width={w} />
        ) : (
          <FreeSeats {...props} width={w} />
        )}
        {props.children}
      </div>
    </div>
  )
}

/** "Power Ludo", "Teams 2v2", "3 rounds"… — the room's settings, short. */
function optionChips(meta: RoomMeta): string[] {
  const out: string[] = []
  for (const [key, v] of Object.entries(meta.options ?? {})) {
    if (
      meta.game === "ludo" &&
      ((key === "mode" && v === "classic") || (key === "teams" && v === "solo"))
    )
      continue
    if (meta.game === "ludo")
      out.push(key === "mode" ? "Power Ludo" : "Teams 2v2")
    else if (key === "rounds") out.push(`${v} rounds`)
    else if (key === "drawTime") out.push(`${v}s to draw`)
    else if (key === "level")
      out.push(String(v).replace(/^\w/, (c) => c.toUpperCase()))
    else if (key === "minutes") out.push(`${v} min`)
  }
  return out
}

/* ── Every player alone ──────────────────────────────────────────────── */

function FreeSeats({
  meta,
  players,
  uid,
  canKick,
  onKick,
  onInvite,
  width,
}: PartySceneProps & { width: number }) {
  const rows = rowsOf(meta.maxPlayers, width >= 640)
  const most = Math.max(...rows)
  const gap = width < 380 ? 8 : 14
  const bw = Math.floor(
    Math.min(132, (Math.min(width, 760) - 24 - 14 - gap * (most - 1)) / most)
  )
  let seat = 0
  return (
    <div className="flex flex-col items-center" style={{ gap: gap + 6 }}>
      {rows.map((n, r) => (
        <div key={r} className="flex justify-center" style={{ gap }}>
          {Array.from({ length: n }, () => {
            const s = seat++
            const p = playerInSeat(players, s)
            return p ? (
              <SeatBanner
                key={s}
                width={bw}
                tone={seatTone(meta, s)}
                player={p}
                you={p.uid === uid}
                host={p.uid === meta.hostId}
                onKick={canKick && p.uid !== uid ? () => onKick(p) : undefined}
                delay={s}
              />
            ) : (
              <OpenBanner
                key={s}
                width={bw}
                label="Invite"
                onClick={onInvite}
                delay={s}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** A banner hanging from a gold rod: the player's character, name and tags. */
function SeatBanner({
  width,
  tone,
  player,
  you,
  host,
  onKick,
  delay,
}: {
  width: number
  tone: string
  player: RoomPlayer
  you: boolean
  host: boolean
  onKick?: () => void
  delay: number
}) {
  const avatar = Math.round(width * 0.58)
  return (
    <Banner width={width} tone={tone} delay={delay}>
      <Face player={player} size={avatar} onKick={onKick} />
      <Name player={player} you={you} host={host} />
    </Banner>
  )
}

function OpenBanner({
  width,
  label,
  onClick,
  delay,
}: {
  width: number
  label: string
  onClick?: () => void
  delay: number
}) {
  const avatar = Math.round(width * 0.58)
  return (
    <Banner width={width} delay={delay} open>
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span
          className="lb-breathe flex items-center justify-center rounded-full border-2 border-dashed border-white/60 bg-white/10 text-white"
          style={{ width: avatar, height: avatar }}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            className="size-6"
            strokeWidth={2.4}
          />
        </span>
        <span className="lb-font text-xs font-extrabold text-white/90">
          {label}
        </span>
      </button>
    </Banner>
  )
}

/** The banner cloth (an SVG, so the notched end and the gold trim stay crisp at any size). */
function Banner({
  width,
  tone,
  open = false,
  delay = 0,
  children,
  className,
  bottomPad = 0.24,
}: {
  width: number
  tone?: string
  open?: boolean
  delay?: number
  children: React.ReactNode
  className?: string
  /** Room for the notched end, as a share of the width. */
  bottomPad?: number
}) {
  const id = React.useId().replace(/:/g, "")
  return (
    <div
      className={cn("lb-pop relative flex flex-col items-center", className)}
      style={{ width, animationDelay: `${delay * 60}ms` }}
    >
      {/* The rod */}
      <div
        aria-hidden
        className="relative z-10 h-2 rounded-full"
        style={{
          width: width + 14,
          background: open
            ? "rgba(255,255,255,.35)"
            : "linear-gradient(180deg,#fff0a8,#e9a521 60%,#a8640c)",
          boxShadow: "0 2px 4px rgba(0,0,0,.35)",
        }}
      >
        <span
          className="absolute top-1/2 -left-1 size-3 -translate-y-1/2 rounded-full"
          style={{ background: open ? "rgba(255,255,255,.45)" : "#f6c445" }}
        />
        <span
          className="absolute top-1/2 -right-1 size-3 -translate-y-1/2 rounded-full"
          style={{ background: open ? "rgba(255,255,255,.45)" : "#f6c445" }}
        />
      </div>
      <div className="relative -mt-1 w-full">
        <svg
          aria-hidden
          className="absolute inset-0 size-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor={tone ?? "#fff"}
                stopOpacity={open ? 0.1 : 1}
              />
              <stop
                offset="1"
                stopColor={
                  open ? "#fff" : `color-mix(in oklab, ${tone} 62%, #1a0626)`
                }
                stopOpacity={open ? 0.04 : 1}
              />
            </linearGradient>
          </defs>
          {/* A cheap drop shadow: the same shape, offset and faint (no filter) */}
          {!open && (
            <path
              d="M3 4 H101 V90 L52 104 L3 90 Z"
              fill="rgba(0,0,0,.22)"
            />
          )}
          <path
            d="M1 0 H99 V86 L50 100 L1 86 Z"
            fill={`url(#${id}g)`}
            stroke={open ? "rgba(255,255,255,.55)" : "#ffd36b"}
            strokeWidth="2"
            strokeDasharray={open ? "6 5" : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {!open && (
            <path
              d="M6 4 H94 V82 L50 95 L6 82 Z"
              fill="none"
              stroke="rgba(255,236,170,.45)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div
          className="relative flex flex-col items-center gap-1 px-1.5 pt-3"
          style={{ paddingBottom: width * bottomPad }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** The player's character in a gold ring, with their level crest, online dot (and the host's remove button). */
function Face({
  player,
  size,
  onKick,
  dot,
}: {
  player: RoomPlayer
  size: number
  onKick?: () => void
  dot?: string
}) {
  return (
    <span className="relative inline-flex">
      <span
        className="rounded-full p-[3px] shadow-[0_4px_10px_rgba(0,0,0,.35)]"
        style={{ background: "linear-gradient(180deg,#fff3b0,#e9a521)" }}
      >
        <GameAvatar
          character={player.avatar}
          frame={player.frame}
          photo={player.photo}
          name={player.name}
          size={size}
          mode="idle"
        />
      </span>
      {validLevel(player.level) && (
        <span className="absolute -top-1.5 -left-1.5 flex">
          <LevelBadge level={validLevel(player.level)!} size={Math.round(Math.min(26, Math.max(16, size * 0.4)))} />
        </span>
      )}
      <span
        className={cn(
          "absolute right-0.5 bottom-0.5 size-3 rounded-full ring-2 ring-white",
          player.online ? "bg-success" : "bg-neutral-400"
        )}
        aria-label={player.online ? "Online" : "Offline"}
      />
      {dot && (
        <span
          className="absolute bottom-0.5 left-0.5 size-3.5 rounded-full ring-2 ring-white"
          style={{ background: dot }}
          aria-hidden
        />
      )}
      {onKick && (
        <button
          type="button"
          aria-label={`Remove ${player.name}`}
          onClick={onKick}
          className="lb-glass absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </button>
      )}
    </span>
  )
}

function Name({
  player,
  you,
  host,
}: {
  player: RoomPlayer
  you: boolean
  host: boolean
}) {
  return (
    <span className="flex max-w-full flex-col items-center leading-tight">
      <span className="flex max-w-full items-center gap-0.5">
        {host && (
          <HugeiconsIcon
            icon={CrownIcon}
            className="size-3.5 shrink-0 text-[#ffd84a]"
            aria-label="Host"
          />
        )}
        <span className="lb-font truncate text-xs font-extrabold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.5)]">
          {you ? "You" : player.name.split(" ")[0]}
        </span>
      </span>
      {!player.online && (
        <span className="text-[10px] font-semibold text-white/70">Offline</span>
      )}
    </span>
  )
}

/* ── Ludo teams 2v2 ──────────────────────────────────────────────────── */

function TeamSeats({
  meta,
  players,
  uid,
  canKick,
  onKick,
  onInvite,
  onMove,
  moving,
  width,
}: PartySceneProps & { width: number }) {
  const me = players.find((p) => p.uid === uid && !p.left)
  const bench = benchedPlayer(meta, players)
  const full = freeSeats(meta, players).length === 0
  const myTeam = me && me.seat < meta.maxPlayers ? teamOfSeat(me.seat) : null
  const mid = width < 380 ? 58 : 84
  // Room for the gap, the middle column and the rods that stick out of each banner
  const bw = Math.floor(
    Math.min(168, (Math.min(width, 640) - 24 - mid - 12 - 16) / 2)
  )
  const avatar = Math.round(Math.min(bw * 0.5, 72))
  const benchSize = Math.round(avatar * 0.72)

  const slot = (seat: number) => {
    const p = playerInSeat(players, seat)
    const dot = TOKEN_COLOURS[SEAT_COLOURS[seat]]
    if (p)
      return (
        <div key={seat} className="flex w-full flex-col items-center gap-1">
          <Face
            player={p}
            size={avatar}
            dot={dot}
            onKick={canKick && p.uid !== uid ? () => onKick(p) : undefined}
          />
          <Name player={p} you={p.uid === uid} host={p.uid === meta.hostId} />
        </div>
      )
    // An open seat: switch into it (other side, or from the bench); on your own side, invite someone
    const canSwitch =
      canMoveTo(meta, players, uid, seat) &&
      (myTeam === null || teamOfSeat(seat) !== myTeam)
    return (
      <button
        key={seat}
        type="button"
        disabled={moving}
        onClick={canSwitch ? () => onMove(seat) : onInvite}
        className="flex w-full flex-col items-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
      >
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full border-2 border-dashed text-white",
            canSwitch
              ? "lb-breathe border-white bg-white/25"
              : "border-white/60 bg-white/10"
          )}
          style={{ width: avatar + 6, height: avatar + 6 }}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            className="size-6"
            strokeWidth={2.4}
          />
          <span
            className="absolute bottom-0.5 left-0.5 size-3.5 rounded-full opacity-70 ring-2 ring-white"
            style={{ background: dot }}
            aria-hidden
          />
        </span>
        <span className="lb-font text-xs font-extrabold text-white">
          {canSwitch
            ? bench?.uid === uid
              ? "Sit here"
              : "Switch here"
            : "Invite"}
        </span>
      </button>
    )
  }

  const team = (t: TeamIndex) => {
    const look = TEAM_TONES[t]
    return (
      <Banner width={bw} tone={look.tone} delay={t} bottomPad={0.2}>
        <Gloss
          size={Math.round(Math.min(bw * 0.13, 18))}
          rim={look.rim}
          tint={look.tint}
          className="mb-1"
        >
          {TEAM_NAMES[t].toUpperCase()}
        </Gloss>
        <div className="flex w-full flex-col items-center gap-2.5">
          {teamSeats(t).map(slot)}
        </div>
      </Banner>
    )
  }

  const benchOpen =
    !bench && full && !!me && canMoveTo(meta, players, uid, benchSeat(meta))
  return (
    <div className="flex items-start justify-center" style={{ gap: 6 }}>
      {team(0)}
      <div
        className="flex flex-col items-center gap-3 self-stretch pt-[18%]"
        style={{ width: mid }}
      >
        <Gloss
          size={Math.round(mid * 0.62)}
          rim="#7a3e00"
          tint="#ffb020"
          top="#fff3b0"
          className="lb-slam tracking-[-0.04em]"
        >
          VS
        </Gloss>
        {(bench || full) && (
          <div className="lb-fade-up mt-auto mb-[18%] flex flex-col items-center gap-1">
            {bench ? (
              <span className="flex flex-col items-center gap-0.5">
                <Face player={bench} size={benchSize} />
                <span className="lb-font max-w-full truncate text-[11px] font-extrabold text-white">
                  {bench.uid === uid ? "You" : bench.name.split(" ")[0]}
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onMove(benchSeat(meta))}
                disabled={!benchOpen || moving}
                aria-label="Step onto the bench to swap sides"
                className="flex flex-col items-center gap-0.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
              >
                <span
                  className="flex items-center justify-center rounded-full border-2 border-dashed border-white/70 bg-black/20 text-[10px] font-extrabold text-white"
                  style={{ width: benchSize, height: benchSize }}
                >
                  Swap
                </span>
              </button>
            )}
            <BenchArt width={Math.round(mid * 0.95)} />
            <span className="text-[10px] font-bold tracking-wider text-white/80 uppercase">
              Bench
            </span>
          </div>
        )}
      </div>
      {team(1)}
    </div>
  )
}

function BenchArt({ width }: { width: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 80 26"
      style={{ width, height: (width * 26) / 80 }}
    >
      <rect x="4" y="4" width="72" height="7" rx="3" fill="#c98a2b" />
      <rect x="4" y="4" width="72" height="3" rx="1.5" fill="#e6b45a" />
      <rect x="10" y="11" width="6" height="14" rx="2" fill="#8a5a1c" />
      <rect x="64" y="11" width="6" height="14" rx="2" fill="#8a5a1c" />
    </svg>
  )
}
