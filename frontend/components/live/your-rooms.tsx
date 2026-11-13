"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card } from "@/components/ui/card"
import { useRoomNode } from "@/hooks/use-live-room"
import { LIVE_GAMES } from "@/lib/live/games"
import type { RoomMeta } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { forgetUserRoom, watchUserRooms } from "@/services/live-rooms"

const MAX_ROOMS = 12

/**
 * Rooms you've been in lately, newest first: get back into one that's waiting
 * or in progress, or see how a finished one went. Rooms that were deleted
 * disappear from the list by themselves.
 */
export function YourRooms({ uid }: { uid: string }) {
  const [codes, setCodes] = React.useState<string[]>([])
  React.useEffect(() => {
    if (!uid) return
    return watchUserRooms(uid, (rooms) =>
      setCodes(rooms.slice(0, MAX_ROOMS).map((r) => r.code))
    )
  }, [uid])

  if (codes.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Your rooms</h2>
      <Card className="gap-0 divide-y py-0">
        {codes.map((code) => (
          <RoomRow key={code} code={code} uid={uid} />
        ))}
      </Card>
    </section>
  )
}

/** What the row says about the room, from its meta alone. */
function statusOf(
  meta: RoomMeta,
  uid: string
): { label: string; tone: string; action: string } {
  if (meta.status === "ended") {
    // RTDB drops an empty winnerIds array, so a draw arrives without one.
    const winners = meta.result ? (meta.result.winnerIds ?? []) : undefined
    const outcome = !winners
      ? ""
      : winners.length === 0
        ? " · Draw"
        : winners.includes(uid)
          ? " · You won"
          : " · You lost"
    return {
      label: `Finished${outcome}`,
      tone: outcome === " · You won" ? "text-success" : "text-muted-foreground",
      action: "Open",
    }
  }
  if (meta.status === "playing")
    return { label: "In progress", tone: "text-primary", action: "Rejoin" }
  return { label: "Waiting in lobby", tone: "text-warning", action: "Join" }
}

function RoomRow({ code, uid }: { code: string; uid: string }) {
  const { data: meta } = useRoomNode<RoomMeta>(code, "meta")
  const gone = meta === null
  // A deleted room has nothing to show: drop it from the list for good
  React.useEffect(() => {
    if (gone) void forgetUserRoom(uid, code)
  }, [gone, uid, code])

  // Loading or deleted: nothing yet (the section is only as tall as its rows)
  if (!meta) return null
  const game = LIVE_GAMES[meta.game]
  const status = statusOf(meta, uid)
  const finished = meta.status === "ended"

  return (
    <div className="flex items-center">
      <Link
        href={`/play/${code}`}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 transition-colors hover:bg-muted/50",
          finished ? "pr-1" : "pr-4"
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg text-xl",
            game.tone
          )}
          aria-hidden
        >
          {game.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {game.name}{" "}
            <span className="font-mono text-xs font-normal tracking-wider text-muted-foreground">
              {code}
            </span>
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 truncate text-xs font-medium",
              status.tone
            )}
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-current"
            />
            <span className="truncate">
              {status.label}
              {meta.hostId !== uid && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {meta.hostName.split(" ")[0]}&apos;s room
                </span>
              )}
            </span>
          </span>
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-0.5 text-xs font-semibold",
            finished ? "text-muted-foreground" : "text-primary"
          )}
        >
          {status.action}
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </span>
      </Link>
      {finished && (
        <button
          type="button"
          aria-label={`Remove ${game.name} room ${code} from your rooms`}
          onClick={() => void forgetUserRoom(uid, code)}
          className="mr-2 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
        </button>
      )}
    </div>
  )
}
