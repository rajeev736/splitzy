"use client"

import * as React from "react"
import Link from "next/link"
import { Cancel01Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GameSectionTitle } from "@/components/game-ui/kit"
import { useMarkNotificationRead } from "@/hooks/mutations"
import { useNotifications } from "@/hooks/queries"
import { useRoomNode, useServerClock } from "@/hooks/use-live-room"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { TrophyIcon } from "@/components/rewards/trophy"
import { LIVE_GAMES } from "@/lib/live/games"
import { roomLiveness, type RoomLiveness } from "@/lib/live/liveness"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { closeAbandonedRoom, forgetUserRoom, watchUserRooms } from "@/services/live-rooms"

const MAX_ROOMS = 12
/** An invite older than this is stale: that room has long started or closed. */
const INVITE_TTL_MS = 3 * 60 * 60 * 1000
/** Finished games shown before "Show all". */
const RECENT_SHOWN = 3

/* ── Live room meta + seats, one small listener pair per room ─────────── */

export type WatchedRoom = { meta: RoomMeta | null | undefined; players: Record<string, RoomPlayer> | null | undefined }
type Watched = Record<string, WatchedRoom>

function RoomWatcher({ code, onRoom }: { code: string; onRoom: (code: string, room: WatchedRoom) => void }) {
  const { data: meta } = useRoomNode<RoomMeta>(code, "meta")
  const { data: players } = useRoomNode<Record<string, RoomPlayer>>(code, "players")
  React.useEffect(() => onRoom(code, { meta, players }), [code, meta, players, onRoom])
  return null
}

/** The meta and seats of each room in `codes`, live, plus the (invisible) listeners to render. */
export function useWatchedRooms(codes: string[]) {
  const [rooms, setRooms] = React.useState<Watched>({})
  const onRoom = React.useCallback(
    (code: string, room: WatchedRoom) =>
      setRooms((m) => (m[code]?.meta === room.meta && m[code]?.players === room.players ? m : { ...m, [code]: room })),
    []
  )
  const watchers = codes.map((code) => <RoomWatcher key={code} code={code} onRoom={onRoom} />)
  return { rooms, watchers }
}

/* ── Invites you dismissed (per device) ──────────────────────────────── */

const DISMISSED_KEY = "joysplit_dismissed_invites"
const dismissedListeners = new Set<() => void>()
let dismissedCache: string[] | null = null
const NONE: string[] = []

function readDismissed(): string[] {
  if (dismissedCache) return dismissedCache
  try {
    dismissedCache = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]
  } catch {
    dismissedCache = []
  }
  return dismissedCache
}

function dismissInvite(code: string) {
  dismissedCache = [code, ...readDismissed().filter((c) => c !== code)].slice(0, 50)
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedCache))
  } catch {
    /* storage unavailable */
  }
  dismissedListeners.forEach((l) => l())
}

function useDismissed() {
  return React.useSyncExternalStore(
    (l) => {
      dismissedListeners.add(l)
      return () => dismissedListeners.delete(l)
    },
    readDismissed,
    () => NONE
  )
}

/* ── Everything the Live tab shows about rooms ───────────────────────── */

export interface RoomInvite {
  code: string
  from: string
  at: number
  notificationId: string
  read: boolean
}

export type Room = { code: string; meta: RoomMeta; live: RoomLiveness }

/**
 * Your rooms and the invites waiting for you, sorted into what the Live tab
 * shows: the game you're in (waiting or playing), invites to rooms still in
 * their lobby, and finished games. Render `watchers` somewhere (they draw
 * nothing; they keep each room live).
 *
 * A room nobody has had open for a long while (everyone closed the app
 * without leaving) isn't shown as "in progress": it reads "everyone's away",
 * and once abandoned for good this device closes it (lib/live/liveness).
 */
export function useLiveRooms(uid: string | undefined) {
  const [codes, setCodes] = React.useState<string[]>([])
  React.useEffect(() => {
    if (!uid) return
    return watchUserRooms(uid, (rooms) => setCodes(rooms.slice(0, MAX_ROOMS).map((r) => r.code)))
  }, [uid])

  // A slow tick: "away" and "abandoned" move in minutes
  const { now } = useServerClock(30_000)

  // Invites: the newest per room, from the last few hours, not dismissed, not a room you're already in
  const { data: notifications } = useNotifications()
  const dismissed = useDismissed()
  const invites = React.useMemo(() => {
    const byCode = new Map<string, RoomInvite>()
    for (const n of notifications) {
      const code = n.type === "ROOM_INVITE" ? n.data?.roomCode : undefined
      const at = Date.parse(n.createdAt)
      if (!code || !(now - at < INVITE_TTL_MS) || dismissed.includes(code) || codes.includes(code)) continue
      const prev = byCode.get(code)
      if (!prev || prev.at < at)
        byCode.set(code, { code, from: n.data?.actorName ?? "A friend", at, notificationId: n.id, read: n.read })
    }
    return [...byCode.values()].sort((a, b) => b.at - a.at)
  }, [notifications, dismissed, codes, now])

  const watched = React.useMemo(() => [...codes, ...invites.map((i) => i.code)], [codes, invites])
  const { rooms, watchers } = useWatchedRooms(watched)

  // A deleted room has nothing to show: drop it from your list for good
  React.useEffect(() => {
    if (!uid) return
    for (const code of codes) if (rooms[code]?.meta === null) void forgetUserRoom(uid, code)
  }, [uid, codes, rooms])

  const mine: Room[] = codes.flatMap((code) => {
    const r = rooms[code]
    if (!r?.meta || r.players === undefined) return []
    return [{ code, meta: r.meta, live: roomLiveness(r.meta, r.players, now) }]
  })

  // Abandoned for good: close it (once per room per visit)
  const closing = React.useRef(new Set<string>())
  React.useEffect(() => {
    if (!uid) return
    for (const r of mine) {
      if (!r.live.abandoned || closing.current.has(r.code)) continue
      closing.current.add(r.code)
      void closeAbandonedRoom(uid, r.meta).catch(() => undefined)
    }
  })

  return {
    watchers,
    now,
    active: mine.filter((r) => r.meta.status !== "ended"),
    finished: mine.filter((r) => r.meta.status === "ended"),
    // Only rooms still gathering players, with someone inside, can be joined
    invites: invites.flatMap((i) => {
      const r = rooms[i.code]
      if (!r?.meta || r.meta.status !== "lobby") return []
      const live = roomLiveness(r.meta, r.players, now)
      return live.life === "idle" ? [] : [{ ...i, meta: r.meta }]
    }),
  }
}

/* ── The sections (Games hub, game-ui look) ──────────────────────────── */

/** What the room is doing, for its card. */
export function roomStatus(r: { meta: RoomMeta; live: RoomLiveness }) {
  if (r.live.life === "idle")
    return { label: r.meta.status === "playing" ? "Paused · everyone left" : "Nobody inside", tone: "#8a5a36", pulse: false }
  if (r.meta.status === "playing") return { label: "In progress", tone: "#15a07a", pulse: true }
  if (r.meta.status === "countdown") return { label: "Starting…", tone: "#15a07a", pulse: true }
  return { label: "Waiting for players", tone: "#d9601c", pulse: true }
}

/** The game you're in right now — big, so getting back is one tap. */
export function ActiveRooms({ rooms, uid }: { rooms: Room[]; uid: string }) {
  if (rooms.length === 0) return null
  return (
    <section className="flex flex-col gap-3" aria-label="Your game">
      <GameSectionTitle>Your game</GameSectionTitle>
      {rooms.map((r) => {
        const { code, meta } = r
        const game = LIVE_GAMES[meta.game]
        const status = roomStatus(r)
        return (
          <Link key={code} href={`/play/${code}`} className="gu-panel-flat flex items-center gap-3 p-3 active:translate-y-px">
            <LiveGameLogo game={game.id} className="size-14 rounded-2xl" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: status.tone }}>
                <span aria-hidden className="relative flex size-2">
                  {status.pulse && <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />}
                  <span className="relative size-2 rounded-full bg-current" />
                </span>
                {status.label}
              </span>
              <span className="mt-0.5 block truncate text-lg leading-tight font-bold">{game.name}</span>
              <span className="block truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
                {meta.hostId === uid ? "Your room" : `${meta.hostName.split(" ")[0]}'s room`} · {code}
              </span>
            </span>
            <span className="gu-btn gu-green gu-btn-sm pointer-events-none shrink-0">
              {meta.status === "playing" ? "Rejoin" : "Open"}
            </span>
          </Link>
        )
      })}
    </section>
  )
}

/** Friends asking you into their room: join in one tap, or wave it away. */
export function RoomInvites({ invites, now }: { invites: (RoomInvite & { meta: RoomMeta })[]; now: number }) {
  const markRead = useMarkNotificationRead()
  if (invites.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle count={invites.length}>Invites</GameSectionTitle>
      <div className="gu-panel-flat flex flex-col divide-y divide-[var(--gu-line)] px-1">
        {invites.map((inv) => {
          const game = LIVE_GAMES[inv.meta.game]
          return (
            <div key={inv.code} className="flex items-center gap-3 py-2.5 pr-1 pl-2">
              <LiveGameLogo game={game.id} className="size-11 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{game.name}</span>
                <span className="block truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
                  From {inv.from.split(" ")[0]} · {ago(inv.at, now)}
                </span>
              </span>
              <Link
                href={`/play/${inv.code}`}
                onClick={() => {
                  if (!inv.read) markRead.mutate(inv.notificationId)
                }}
                className="gu-btn gu-green gu-btn-sm shrink-0"
              >
                <HugeiconsIcon icon={PlayIcon} className="size-4" strokeWidth={2.4} />
                Join
              </Link>
              <button
                type="button"
                aria-label={`Dismiss ${inv.from}'s ${game.name} invite`}
                onClick={() => {
                  dismissInvite(inv.code)
                  if (!inv.read) markRead.mutate(inv.notificationId)
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--gu-ink-soft)] active:bg-black/5"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2.4} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

type Outcome = "won" | "lost" | "draw" | "left" | "done"

const OUTCOMES: Record<Outcome, { label: string; className: string }> = {
  won: {
    label: "You won",
    className: "bg-[linear-gradient(180deg,#fff0a0,#ffcd3c_60%,#f5b11c)] text-[#6b3d00] shadow-[0_2px_0_#d99a0b,inset_0_1px_0_#fffbe2]",
  },
  lost: { label: "You lost", className: "bg-[#ffe3e3] text-[var(--gu-red-deep)] shadow-[0_2px_0_#f2b7b7]" },
  draw: { label: "Draw", className: "bg-[#e4eeff] text-[var(--gu-blue-deep)] shadow-[0_2px_0_#bcd2fa]" },
  left: { label: "Everyone left", className: "bg-[var(--gu-cream-2)] text-[var(--gu-brown)] shadow-[0_2px_0_var(--gu-line)]" },
  done: { label: "Finished", className: "bg-[var(--gu-cream-2)] text-[var(--gu-brown)] shadow-[0_2px_0_var(--gu-line)]" },
}

/** How a game ended for you, as a chunky coloured pill — a gold one with the trophy for a win. */
function OutcomePill({ outcome }: { outcome: Outcome }) {
  const o = OUTCOMES[outcome]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] leading-none font-bold tracking-wide uppercase",
        outcome === "won" && "pl-1.5",
        o.className
      )}
    >
      {outcome === "won" && <TrophyIcon className="size-[18px]" />}
      {o.label}
    </span>
  )
}

/** Finished games, newest first: a few, then "Show all". Each can be cleared away. */
export function RecentRooms({ rooms, uid }: { rooms: Room[]; uid: string }) {
  const [all, setAll] = React.useState(false)
  if (rooms.length === 0) return null
  const shown = all ? rooms : rooms.slice(0, RECENT_SHOWN)
  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle
        action={
          <button
            type="button"
            onClick={() => rooms.forEach((r) => void forgetUserRoom(uid, r.code))}
            className="gu-chip active:translate-y-px"
          >
            Clear all
          </button>
        }
      >
        Recent games
      </GameSectionTitle>
      <div className="gu-panel-flat flex flex-col divide-y divide-[var(--gu-line)] px-1">
        {shown.map(({ code, meta }) => {
          const game = LIVE_GAMES[meta.game]
          // RTDB drops an empty winnerIds array, so a draw arrives without one
          const winners = meta.result ? (meta.result.winnerIds ?? []) : undefined
          const outcome: Outcome = !winners
            ? "done"
            : meta.result?.reason === "everyone_left"
              ? "left"
              : winners.length === 0
                ? "draw"
                : winners.includes(uid)
                  ? "won"
                  : "lost"
          return (
            <div key={code} className="flex items-center">
              <Link href={`/play/${code}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-1 pl-2">
                <LiveGameLogo game={game.id} className="size-12 rounded-2xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base leading-tight font-bold">{game.name}</span>
                  <span className="mt-1 flex min-w-0 items-center gap-2">
                    <OutcomePill outcome={outcome} />
                    {meta.hostId !== uid && (
                      <span className="truncate text-xs font-semibold text-[var(--gu-ink-soft)]">
                        {meta.hostName.split(" ")[0]}&apos;s room
                      </span>
                    )}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Remove ${game.name} room ${code} from recent games`}
                onClick={() => void forgetUserRoom(uid, code)}
                className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--gu-ink-soft)] active:bg-black/5"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2.4} />
              </button>
            </div>
          )
        })}
        {rooms.length > RECENT_SHOWN && (
          <button type="button" onClick={() => setAll((v) => !v)} className="py-2.5 text-center text-sm font-bold text-[var(--gu-blue-deep)]">
            {all ? "Show less" : `Show all (${rooms.length})`}
          </button>
        )}
      </div>
    </section>
  )
}

/** "just now", "5m ago", "2h ago". */
function ago(at: number, now: number) {
  const min = Math.max(0, Math.round((now - at) / 60_000))
  return min < 1 ? "just now" : min < 60 ? `${min}m ago` : `${Math.round(min / 60)}h ago`
}
