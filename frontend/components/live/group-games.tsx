"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight01Icon, Notification03Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { GameButton } from "@/components/game-ui/kit"
import { useSession } from "@/components/providers/session-provider"
import { Card } from "@/components/ui/card"
import { useRoomNode, useServerClock } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { isLiveConfigured } from "@/lib/firebase/config"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAME_IDS, LIVE_GAMES } from "@/lib/live/games"
import { roomLiveness } from "@/lib/live/liveness"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"
import type { Group } from "@/lib/types"
import { cn } from "@/lib/utils"
import { forgetGroupRoom, watchGroupRooms, type GroupRoom } from "@/services/live-rooms"
import { callGroupToLounge, watchLounge, type Lounge } from "@/services/lounges"

/**
 * A group's live games: its always-open game room (components/live/lounge) —
 * who's in it now, a way in, and a button that calls everyone — plus any
 * other rooms members opened for the group.
 */
export function GroupGames({ group, uid }: { group: Group; uid: string }) {
  const { user } = useSession()
  const [rooms, setRooms] = React.useState<GroupRoom[]>([])
  const [lounge, setLounge] = React.useState<Lounge | null>(null)
  const [calling, setCalling] = React.useState(false)

  React.useEffect(() => {
    if (!isLiveConfigured) return
    const a = watchGroupRooms(group.id, setRooms)
    const b = watchLounge(group.id, setLounge)
    return () => {
      a()
      b()
    }
  }, [group.id])

  if (!isLiveConfigured) {
    return <Card className="px-4 py-6 text-center text-sm text-muted-foreground">Live games aren&apos;t switched on on this server yet.</Card>
  }

  const here = Object.entries(lounge?.here ?? {})
  const loungeCode = lounge?.room
  const call = async () => {
    if (!user) return
    setCalling(true)
    try {
      const { sent, throttled } = await callGroupToLounge(group.id, group.name, user, group.members, lounge?.game ?? null)
      if (throttled) toast("The group was just called — give them a minute")
      else toast.success(sent > 0 ? `Called ${sent} ${sent === 1 ? "member" : "members"} to the game room` : "Nobody else is in this group yet")
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't call the group"))
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The group's game room: always open */}
      <section className="gu gu-sky relative overflow-hidden rounded-3xl p-4 text-white shadow-[0_6px_0_#3c72d6,0_12px_24px_rgba(30,40,110,.25)]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="gu-title text-2xl leading-tight">Group game room</p>
            <p className="mt-0.5 text-sm font-semibold text-white/95 [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
              Always open — drop in any time, play any game, switch games without leaving.
            </p>
          </div>
          <div className="flex shrink-0 -space-x-2 pt-1">
            {LIVE_GAME_IDS.slice(0, 3).map((id) => (
              <LiveGameLogo key={id} game={id} className="size-9 rounded-xl shadow-[0_0_0_2px_#fff]" />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/25 px-3 py-2">
          {here.length > 0 ? (
            <>
              <span className="flex shrink-0 -space-x-2.5">
                {here.slice(0, 5).map(([id, v]) => (
                  <GameAvatar key={id} character={v.avatar} photo={v.photo} name={v.name} size={30} className="rounded-full shadow-[0_0_0_2px_#fff]" />
                ))}
              </span>
              <span className="min-w-0 truncate text-sm font-bold [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
                {here.length} in the room{lounge?.game ? ` · ${LIVE_GAMES[lounge.game].name}` : ""}
              </span>
            </>
          ) : (
            <span className="text-sm font-bold [text-shadow:0_1px_0_rgba(20,40,110,.35)]">Nobody in the room right now</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <Link href={`/lounge/${group.id}`} className="gu-btn gu-green">
            <HugeiconsIcon icon={PlayIcon} className="size-5" strokeWidth={2.6} />
            {loungeCode && here.length > 0 ? "Join them" : "Enter room"}
          </Link>
          <GameButton tone="yellow" icon={Notification03Icon} onClick={() => void call()} disabled={calling} aria-label="Call the group to play">
            Call
          </GameButton>
        </div>
      </section>

      {rooms.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Other rooms</h2>
          <Card className="gap-0 divide-y py-0">
            {rooms.map((r) => (
              <GroupRoomRow key={r.code} room={r} groupId={group.id} uid={uid} />
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}

/** One of the group's other rooms; hidden (and dropped from the list) once it's over, gone or abandoned. */
function GroupRoomRow({ room, groupId, uid }: { room: GroupRoom; groupId: string; uid: string }) {
  const { data: meta } = useRoomNode<RoomMeta>(room.code, "meta")
  const { data: players } = useRoomNode<Record<string, RoomPlayer>>(room.code, "players")
  const { now } = useServerClock(30_000)
  const live = meta ? roomLiveness(meta, players, now) : null
  const over = meta === null || meta?.status === "ended" || !!live?.abandoned
  React.useEffect(() => {
    if (over) void forgetGroupRoom(groupId, room.code)
  }, [over, groupId, room.code])
  if (!meta || over || !live) return null

  const info = LIVE_GAMES[meta.game]
  const inLobby = meta.status === "lobby" || meta.status === "countdown"
  const host = meta.hostId === uid ? "Your room" : `${meta.hostName.split(" ")[0]}'s room`
  const label = live.life === "idle" ? "Nobody inside" : inLobby ? "Waiting for players" : "In progress"
  return (
    <Link href={`/play/${room.code}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <LiveGameLogo game={info.id} className="size-10 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {info.name} <span className="font-normal text-muted-foreground">· {host}</span>
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            live.life === "idle" ? "text-muted-foreground" : inLobby ? "text-warning" : "text-primary"
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {label}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
        {inLobby ? "Join" : "Open"}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
      </span>
    </Link>
  )
}
