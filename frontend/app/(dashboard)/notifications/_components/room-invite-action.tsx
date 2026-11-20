"use client"

import Link from "next/link"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { useRoomNode, useServerClock } from "@/hooks/use-live-room"
import { useNow } from "@/hooks/use-now"
import { roomLiveness } from "@/lib/live/liveness"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"
import type { AppNotification } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Invites older than this aren't looked up: that room is long gone. */
const LOOKUP_FOR_MS = 24 * 60 * 60 * 1000

/**
 * What a room invite can still do, checked live against the room: Join while
 * it's gathering players, Rejoin if you're in the game, otherwise why not
 * ("Game over", "Room closed", "Already started") — never a Join that leads
 * nowhere. A call into a group's game room is always open.
 */
export function RoomInviteAction({
  notif,
  size = "sm",
  look = "app",
  onGo,
}: {
  notif: AppNotification
  size?: "sm" | "lg"
  /** "game": chunky game buttons, for the Games side's notifications. */
  look?: "app" | "game"
  onGo?: () => void
}) {
  const d = notif.data
  // The shared clock, not ticking: an invite expiring a little late is fine
  const now = useNow(0)
  if (d?.lounge && d.groupId) {
    if (look === "game") return <GameLink href={`/lounge/${d.groupId}`} label="Enter room" onGo={onGo} />
    return (
      <Button size={size} className={size === "lg" ? "h-11 w-full" : undefined} nativeButton={false} render={<Link href={`/lounge/${d.groupId}`} onClick={onGo} />}>
        <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
        Enter game room
      </Button>
    )
  }
  if (!d?.roomCode) return null
  if (now - Date.parse(notif.createdAt) > LOOKUP_FOR_MS) return <Status size={size} look={look} text="Invite expired" />
  return <LiveRoomAction code={d.roomCode} size={size} look={look} onGo={onGo} />
}

function LiveRoomAction({ code, size, look, onGo }: { code: string; size: "sm" | "lg"; look: "app" | "game"; onGo?: () => void }) {
  const { user } = useSession()
  const { data: meta } = useRoomNode<RoomMeta>(code, "meta")
  const { data: players } = useRoomNode<Record<string, RoomPlayer>>(code, "players")
  const { now } = useServerClock(30_000)

  if (meta === undefined || players === undefined) return <Status size={size} look={look} text="Checking the room…" />
  if (meta === null) return <Status size={size} look={look} text="Room closed" />
  if (meta.status === "ended") return <Status size={size} look={look} text="Game over" />
  const live = roomLiveness(meta, players, now)
  if (live.life === "idle") return <Status size={size} look={look} text="Room closed — everyone left" />
  const mine = user ? players?.[user.uid] : undefined
  const seated = !!mine && !mine.left
  const joinable = meta.status === "lobby" || meta.status === "countdown"
  if (!seated && !joinable) return <Status size={size} look={look} text="Game already started" />
  const label = seated && meta.status === "playing" ? "Rejoin game" : seated ? "Open room" : "Join room"
  if (look === "game") return <GameLink href={`/play/${code}`} label={label} onGo={onGo} />
  return (
    <Button size={size} className={size === "lg" ? "h-11 w-full" : undefined} nativeButton={false} render={<Link href={`/play/${code}`} onClick={onGo} />}>
      <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
      {label}
    </Button>
  )
}

/** A chunky green game button that goes somewhere. */
function GameLink({ href, label, onGo }: { href: string; label: string; onGo?: () => void }) {
  return (
    <Link href={href} onClick={onGo} className="gu-btn gu-green gu-btn-sm">
      <HugeiconsIcon icon={PlayIcon} className="size-4" strokeWidth={2.4} />
      {label}
    </Link>
  )
}

function Status({ text, size, look = "app" }: { text: string; size: "sm" | "lg"; look?: "app" | "game" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-muted-foreground",
        look === "game" && "font-bold text-[var(--gu-ink-soft)]",
        size === "lg" ? "justify-center py-2 text-sm" : "text-xs"
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {text}
    </span>
  )
}
