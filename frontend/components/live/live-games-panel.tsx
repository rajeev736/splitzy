"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"

import { GameNote, GameSectionTitle } from "@/components/game-ui/kit"
import { GroupIcon } from "@/components/shared/group-icon"
import { useSession } from "@/components/providers/session-provider"
import { useGroups } from "@/hooks/queries"
import { isLiveConfigured } from "@/lib/firebase/config"
import { LIVE_GAME_IDS, LIVE_GAMES } from "@/lib/live/games"
import type { Group } from "@/lib/types"
import { watchLounge, type Lounge } from "@/services/lounges"
import { JoinRoomCard } from "./join-room-card"
import { LiveGameGrid } from "./new-room/pieces"
import { ActiveRooms, RecentRooms, RoomInvites, useLiveRooms } from "./your-rooms"

/** Group game rooms shown on the Live tab. */
const LOUNGES_SHOWN = 4

/**
 * The Live tab on Games, in the order you reach for things: a room code box,
 * the game you're in (if any), friends' invites, your groups' game rooms, then
 * the games to start — and finished games last. Picking a game opens its
 * set-up screen (/play/new/{game}); the room itself lives at /play/{code}.
 */
export function LiveGamesPanel() {
  const router = useRouter()
  const { user } = useSession()
  const rooms = useLiveRooms(user?.uid)
  const { data: groups } = useGroups()

  // Games you played lately come first; the rest keep their usual order
  const played = [...rooms.active, ...rooms.finished].map((r) => r.meta.game)
  const recent = LIVE_GAME_IDS.filter((id) => played.includes(id)).sort((a, b) => played.indexOf(a) - played.indexOf(b))
  const ordered = [...recent, ...LIVE_GAME_IDS.filter((id) => !recent.includes(id))]

  if (!isLiveConfigured) return <NotConfigured />

  return (
    <div className="flex flex-col gap-6">
      {rooms.watchers}
      <JoinRoomCard />
      {user && <ActiveRooms rooms={rooms.active} uid={user.uid} />}
      <RoomInvites invites={rooms.invites} now={rooms.now} />

      <section className="flex flex-col gap-3">
        <GameSectionTitle>Pick a game</GameSectionTitle>
        <LiveGameGrid recent={recent} games={ordered} onPick={(id) => router.push(`/play/new/${id}`)} />
      </section>

      {groups.length > 0 && (
        <section className="flex flex-col gap-3">
          <GameSectionTitle>Group game rooms</GameSectionTitle>
          <div className="flex flex-col gap-2.5">
            {groups.slice(0, LOUNGES_SHOWN).map((g) => (
              <LoungeRow key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}

      {user && <RecentRooms rooms={rooms.finished} uid={user.uid} />}
    </div>
  )
}

/** A group's always-open game room: who's in it now, and what they're playing. */
export function LoungeRow({ group }: { group: Pick<Group, "id" | "name" | "icon"> }) {
  const [lounge, setLounge] = React.useState<Lounge | null>(null)
  React.useEffect(() => watchLounge(group.id, setLounge), [group.id])
  const here = Object.keys(lounge?.here ?? {}).length
  return (
    <Link href={`/lounge/${group.id}`} className="gu-panel-flat flex items-center gap-3 p-3 active:translate-y-px">
      <GroupIcon src={group.icon} alt={group.name} size="lg" className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold">{group.name}</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--gu-ink-soft)]">
          {here > 0 ? (
            <>
              <span className="size-2 rounded-full bg-[var(--gu-green)]" />
              {here} in the room{lounge?.game ? ` · ${LIVE_GAMES[lounge.game].name}` : ""}
            </>
          ) : (
            "Always open · drop in"
          )}
        </span>
      </span>
      <span className="gu-btn gu-btn-sm pointer-events-none shrink-0">Enter</span>
    </Link>
  )
}

/** The Realtime Database URL is missing from this deployment: nothing live can run. */
function NotConfigured() {
  return (
    <GameNote>
      <p className="text-base font-bold text-[var(--gu-ink)]">Live games aren&apos;t switched on here</p>
      <p className="mt-1">
        This server has no Realtime Database URL set (<code className="text-xs">NEXT_PUBLIC_FIREBASE_DATABASE_URL</code>),
        which rooms, drawing and voice need. The challenge games work as usual.
      </p>
    </GameNote>
  )
}
