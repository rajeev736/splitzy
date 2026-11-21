"use client"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import type { RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"

/** Avatars drawn before the rest fold into "+N". */
const SHOWN = 4

/**
 * Who's in a room, for its row in a list: small overlapping avatars and first
 * names ("You, Asha +2"). Players who left for good aren't counted; those who
 * stepped away (room not open right now) sit after the ones inside, dimmed.
 * Draws nothing while the seats load or when nobody's in.
 *
 * Rows are usually links, so a tap on an avatar opens the room, not a profile.
 */
export function RoomMembers({
  players,
  uid,
  ring = "var(--card)",
  className,
  textClassName,
}: {
  players: Record<string, RoomPlayer> | null | undefined
  /** You: listed first, as "You". */
  uid?: string
  /** The row's background, drawn as a ring between overlapping avatars. */
  ring?: string
  className?: string
  textClassName?: string
}) {
  const inside = Object.values(players ?? {})
    .filter((p) => !p.left)
    .sort((a, b) => Number(b.uid === uid) - Number(a.uid === uid) || Number(b.online) - Number(a.online) || a.seat - b.seat)
  if (inside.length === 0) return null

  const shown = inside.slice(0, SHOWN)
  const extra = inside.length - shown.length
  const names = shown.map((p) => (p.uid === uid ? "You" : p.name.split(" ")[0] || p.name)).join(", ")
  const label = inside.map((p) => (p.uid === uid ? "You" : p.name)).join(", ")

  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)} title={label}>
      <span className="sr-only">In the room: {label}</span>
      <span aria-hidden className="flex shrink-0 -space-x-1.5">
        {shown.map((p) => (
          // The ring is the row's colour, passed in: an inline style
          <span key={p.uid} className="relative inline-flex shrink-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${ring}`, background: ring }}>
            <GameAvatar
              character={p.avatar}
              photo={p.photo}
              name={p.name}
              size={20}
              peek={false}
              className={cn("rounded-full", !p.online && "opacity-50 grayscale-[.4]")}
            />
          </span>
        ))}
      </span>
      <span aria-hidden className={cn("min-w-0 truncate text-xs font-semibold", textClassName)}>
        {names}
        {extra > 0 && <span className="font-bold"> +{extra}</span>}
      </span>
    </span>
  )
}
