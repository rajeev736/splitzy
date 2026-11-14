"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card } from "@/components/ui/card"
import { useRoomNode } from "@/hooks/use-live-room"
import { isLiveConfigured } from "@/lib/firebase/config"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAME_IDS, LIVE_GAMES } from "@/lib/live/games"
import type { LiveGameId, RoomMeta } from "@/lib/live/types"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  forgetGroupRoom,
  watchGroupRooms,
  type GroupRoom,
} from "@/services/live-rooms"
import { CreateRoomSheet } from "./create-room-sheet"

/**
 * A group's live games: start one (every member is invited) and see the rooms
 * open right now, to join with one tap. Finished rooms drop off the list.
 */
export function GroupGames({ group, uid }: { group: Group; uid: string }) {
  const [rooms, setRooms] = React.useState<GroupRoom[]>([])
  const [game, setGame] = React.useState<LiveGameId | null>(null)
  // Remembered so the sheet keeps its game while it animates closed
  const [lastGame, setLastGame] = React.useState<LiveGameId>("ludo")

  React.useEffect(() => {
    if (!isLiveConfigured) return
    return watchGroupRooms(group.id, setRooms)
  }, [group.id])

  if (!isLiveConfigured) {
    return (
      <Card className="px-4 py-6 text-center text-sm text-muted-foreground">
        Live games aren&apos;t switched on on this server yet.
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {rooms.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Playing now</h2>
          <Card className="gap-0 divide-y py-0">
            {rooms.map((r) => (
              <GroupRoomRow
                key={r.code}
                room={r}
                groupId={group.id}
                uid={uid}
              />
            ))}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-semibold">Start a game with the group</h2>
          <p className="text-xs text-muted-foreground">
            Everyone in {group.name} gets a notification and can jump in. Voice
            and stickers included.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LIVE_GAME_IDS.map((id) => {
            const info = LIVE_GAMES[id]
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setGame(id)
                  setLastGame(id)
                }}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 active:scale-[0.98]"
              >
                <LiveGameLogo game={info.id} className="size-10 rounded-lg" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {info.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {info.minPlayers === info.maxPlayers
                      ? `${info.maxPlayers} players`
                      : `${info.minPlayers}–${info.maxPlayers} players`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <CreateRoomSheet
        key={lastGame}
        open={game !== null}
        onOpenChange={(open) => !open && setGame(null)}
        game={game ?? lastGame}
        group={{ id: group.id, name: group.name, members: group.members }}
      />
    </div>
  )
}

/** One of the group's rooms; hidden (and dropped from the list) once it's over or gone. */
function GroupRoomRow({
  room,
  groupId,
  uid,
}: {
  room: GroupRoom
  groupId: string
  uid: string
}) {
  const { data: meta } = useRoomNode<RoomMeta>(room.code, "meta")
  const over = meta === null || meta?.status === "ended"
  React.useEffect(() => {
    if (over) void forgetGroupRoom(groupId, room.code)
  }, [over, groupId, room.code])
  if (!meta || over) return null

  const info = LIVE_GAMES[meta.game]
  const inLobby = meta.status === "lobby" || meta.status === "countdown"
  const host =
    meta.hostId === uid ? "Your room" : `${meta.hostName.split(" ")[0]}'s room`
  return (
    <Link
      href={`/play/${room.code}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <LiveGameLogo game={info.id} className="size-10 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {info.name}{" "}
          <span className="font-normal text-muted-foreground">· {host}</span>
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            inLobby ? "text-warning" : "text-primary"
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {inLobby ? "Waiting for players" : "In progress"}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
        {inLobby ? "Join" : "Open"}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
      </span>
    </Link>
  )
}
