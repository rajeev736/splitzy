"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card } from "@/components/ui/card"
import { useMarkNotificationRead } from "@/hooks/mutations"
import { useNotifications } from "@/hooks/queries"
import { useRoomNode } from "@/hooks/use-live-room"
import { useNow } from "@/hooks/use-now"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAMES } from "@/lib/live/games"
import type { RoomMeta } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { forgetUserRoom, watchUserRooms } from "@/services/live-rooms"

const MAX_ROOMS = 12
/** An invite older than this is stale: that room has long started or closed. */
const INVITE_TTL_MS = 3 * 60 * 60 * 1000
/** Finished games shown before "Show all". */
const RECENT_SHOWN = 3

/* ── Live room meta, one small listener per room ───────────────────────── */

type Metas = Record<string, RoomMeta | null | undefined>

function MetaWatcher({ code, onMeta }: { code: string; onMeta: (code: string, meta: RoomMeta | null | undefined) => void }) {
  const { data } = useRoomNode<RoomMeta>(code, "meta")
  React.useEffect(() => onMeta(code, data), [code, data, onMeta])
  return null
}

/** The meta of each room in `codes`, live, plus the (invisible) listeners to render. */
function useRoomMetas(codes: string[]) {
  const [metas, setMetas] = React.useState<Metas>({})
  const onMeta = React.useCallback(
    (code: string, meta: RoomMeta | null | undefined) =>
      setMetas((m) => (m[code] === meta ? m : { ...m, [code]: meta })),
    []
  )
  const watchers = codes.map((code) => <MetaWatcher key={code} code={code} onMeta={onMeta} />)
  return { metas, watchers }
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

/**
 * Your rooms and the invites waiting for you, sorted into what the Live tab
 * shows: the game you're in (waiting or playing), invites to rooms still in
 * their lobby, and finished games. Render `watchers` somewhere (they draw
 * nothing; they keep each room's status live).
 */
export function useLiveRooms(uid: string | undefined) {
  const [codes, setCodes] = React.useState<string[]>([])
  React.useEffect(() => {
    if (!uid) return
    return watchUserRooms(uid, (rooms) => setCodes(rooms.slice(0, MAX_ROOMS).map((r) => r.code)))
  }, [uid])

  // Invites: the newest per room, from the last few hours, not dismissed, not a room you're already in
  const { data: notifications } = useNotifications()
  const dismissed = useDismissed()
  // The shared clock, not ticking (an invite going stale a minute late is fine)
  const now = useNow(0)
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
  const { metas, watchers } = useRoomMetas(watched)

  // A deleted room has nothing to show: drop it from your list for good
  React.useEffect(() => {
    if (!uid) return
    for (const code of codes) if (metas[code] === null) void forgetUserRoom(uid, code)
  }, [uid, codes, metas])

  const mine = codes.flatMap((code) => (metas[code] ? [{ code, meta: metas[code] }] : []))
  return {
    watchers,
    now,
    active: mine.filter((r) => r.meta.status !== "ended"),
    finished: mine.filter((r) => r.meta.status === "ended"),
    // Only rooms still gathering players can be joined
    invites: invites.flatMap((i) => {
      const meta = metas[i.code]
      return meta && meta.status === "lobby" ? [{ ...i, meta }] : []
    }),
  }
}

/* ── The sections ────────────────────────────────────────────────────── */

type Room = { code: string; meta: RoomMeta }

/** The game you're in right now — big, so getting back is one tap. */
export function ActiveRooms({ rooms, uid }: { rooms: Room[]; uid: string }) {
  if (rooms.length === 0) return null
  return (
    <section className="flex flex-col gap-2" aria-label="Your game">
      {rooms.map(({ code, meta }) => {
        const game = LIVE_GAMES[meta.game]
        const playing = meta.status === "playing" || meta.status === "countdown"
        return (
          <Link
            key={code}
            href={`/play/${code}`}
            className="group flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 shadow-xs transition-colors hover:bg-primary/10"
          >
            <LiveGameLogo game={game.id} className="size-12 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span aria-hidden className="relative flex size-2">
                  {playing && <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />}
                  <span className="relative size-2 rounded-full bg-current" />
                </span>
                {playing ? "In progress" : "Waiting in lobby"}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold">
                {game.name}{" "}
                <span className="font-mono text-xs font-normal tracking-wider text-muted-foreground">{code}</span>
              </span>
              {meta.hostId !== uid && (
                <span className="block truncate text-xs text-muted-foreground">{meta.hostName.split(" ")[0]}&apos;s room</span>
              )}
            </span>
            <span className="flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground">
              {playing ? "Rejoin" : "Open"}
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
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
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        Invites
        <span className="rounded-full bg-primary px-1.5 text-[11px] leading-[18px] font-bold text-primary-foreground tabular-nums">
          {invites.length}
        </span>
      </h2>
      <Card className="gap-0 divide-y py-0">
        {invites.map((inv) => {
          const game = LIVE_GAMES[inv.meta.game]
          return (
            <div key={inv.code} className="flex items-center gap-3 py-2.5 pr-2 pl-3">
              <LiveGameLogo game={game.id} className="size-10 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{game.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  From {inv.from.split(" ")[0]} · {ago(inv.at, now)}
                </span>
              </span>
              <Link
                href={`/play/${inv.code}`}
                onClick={() => {
                  if (!inv.read) markRead.mutate(inv.notificationId)
                }}
                className="flex h-8 shrink-0 items-center rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Join
              </Link>
              <button
                type="button"
                aria-label={`Dismiss ${inv.from}'s ${game.name} invite`}
                onClick={() => {
                  dismissInvite(inv.code)
                  if (!inv.read) markRead.mutate(inv.notificationId)
                }}
                className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>
          )
        })}
      </Card>
    </section>
  )
}

/** Finished games, newest first: a few, then "Show all". Each can be cleared away. */
export function RecentRooms({ rooms, uid }: { rooms: Room[]; uid: string }) {
  const [all, setAll] = React.useState(false)
  if (rooms.length === 0) return null
  const shown = all ? rooms : rooms.slice(0, RECENT_SHOWN)
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent games</h2>
        <button
          type="button"
          onClick={() => rooms.forEach((r) => void forgetUserRoom(uid, r.code))}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      </div>
      <Card className="gap-0 divide-y py-0">
        {shown.map(({ code, meta }) => {
          const game = LIVE_GAMES[meta.game]
          // RTDB drops an empty winnerIds array, so a draw arrives without one
          const winners = meta.result ? (meta.result.winnerIds ?? []) : undefined
          const outcome = !winners ? "Finished" : winners.length === 0 ? "Draw" : winners.includes(uid) ? "You won" : "You lost"
          return (
            <div key={code} className="flex items-center">
              <Link
                href={`/play/${code}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-1 pl-3 transition-colors hover:bg-muted/50"
              >
                <LiveGameLogo game={game.id} className="size-9 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{game.name}</span>
                  <span className={cn("block truncate text-xs font-medium", outcome === "You won" ? "text-success" : "text-muted-foreground")}>
                    {outcome}
                    {meta.hostId !== uid && (
                      <span className="font-normal"> · {meta.hostName.split(" ")[0]}&apos;s room</span>
                    )}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Remove ${game.name} room ${code} from recent games`}
                onClick={() => void forgetUserRoom(uid, code)}
                className="mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>
          )
        })}
        {rooms.length > RECENT_SHOWN && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="py-2.5 text-center text-xs font-semibold text-primary hover:bg-muted/50"
          >
            {all ? "Show less" : `Show all (${rooms.length})`}
          </button>
        )}
      </Card>
    </section>
  )
}

/** "just now", "5m ago", "2h ago". */
function ago(at: number, now: number) {
  const min = Math.max(0, Math.round((now - at) / 60_000))
  return min < 1 ? "just now" : min < 60 ? `${min}m ago` : `${Math.round(min / 60)}h ago`
}
