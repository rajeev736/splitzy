"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"

import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { GameButton, GameNote, GameSectionTitle } from "@/components/game-ui/kit"
import { GroupIcon } from "@/components/shared/group-icon"
import { useSession } from "@/components/providers/session-provider"
import { useFriends, useGroups } from "@/hooks/queries"
import { isLiveConfigured } from "@/lib/firebase/config"
import { LIVE_GAME_IDS, LIVE_GAMES } from "@/lib/live/games"
import type { Group } from "@/lib/types"
import { watchLounge, type Lounge } from "@/services/lounges"
import { JoinRoomCard } from "./join-room-card"
import { LiveGameGrid } from "./new-room/pieces"
import { ActiveRooms, RecentRooms, RoomInvites, useLiveRooms } from "./your-rooms"

/** Group game rooms shown before "Show all" (rooms with people in them always show). */
const LOUNGES_SHOWN = 3

/**
 * The Live tab on Games, in the order you reach for things: a room code box,
 * the game you're in (if any), friends' invites, your groups' game rooms, then
 * the games to start — and finished games last. Picking a game opens its
 * set-up screen (/play/new/{game}); the room itself lives at /play/{code}.
 */
export function LiveGamesPanel({ invite }: { invite?: string | null }) {
  const router = useRouter()
  const { user } = useSession()
  const rooms = useLiveRooms(user?.uid)
  const { data: groups } = useGroups()
  const { data: friends } = useFriends()
  const inviteName = invite ? (friends.find((f) => f.uid === invite)?.displayName.split(" ")[0] ?? "your friend") : null

  // Games you played lately come first; the rest keep their usual order
  const played = [...rooms.active, ...rooms.finished].map((r) => r.meta.game)
  const recent = LIVE_GAME_IDS.filter((id) => played.includes(id)).sort((a, b) => played.indexOf(a) - played.indexOf(b))
  const ordered = [...recent, ...LIVE_GAME_IDS.filter((id) => !recent.includes(id))]

  if (!isLiveConfigured) return <NotConfigured />

  return (
    <div className="flex flex-col gap-6">
      {rooms.watchers}
      {inviteName ? (
        // From a friend's "Play a game": pick one and the invite goes straight to them
        <GameNote className="!py-3 text-[15px] font-bold text-[var(--gu-ink)]">
          Pick a game to play with {inviteName} — they get the invite right away.
        </GameNote>
      ) : (
        <JoinRoomCard />
      )}
      {user && <ActiveRooms rooms={rooms.active} uid={user.uid} />}
      <RoomInvites invites={rooms.invites} now={rooms.now} />

      <section className="flex flex-col gap-3">
        <GameSectionTitle>Pick a game</GameSectionTitle>
        <LiveGameGrid recent={recent} games={ordered} onPick={(id) => router.push(`/play/new/${id}${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`)} />
      </section>

      {groups.length > 0 && <GroupRooms groups={groups} />}

      {user && <RecentRooms rooms={rooms.finished} uid={user.uid} />}
    </div>
  )
}

/**
 * Your groups' always-open game rooms: the ones with people in them first
 * (all of them), then the rest — a few, and the others behind "Show all".
 */
function GroupRooms({ groups }: { groups: Group[] }) {
  const [lounges, setLounges] = React.useState<Record<string, Lounge | null>>({})
  const ids = groups.map((g) => g.id).join(",")
  React.useEffect(() => {
    const offs = ids.split(",").map((id) => watchLounge(id, (l) => setLounges((prev) => ({ ...prev, [id]: l }))))
    return () => offs.forEach((off) => off())
  }, [ids])
  const [all, setAll] = React.useState(false)

  const count = (id: string) => Object.keys(lounges[id]?.here ?? {}).length
  const busy = groups.filter((g) => count(g.id) > 0).sort((x, y) => count(y.id) - count(x.id))
  const quiet = groups.filter((g) => count(g.id) === 0)
  const shown = all ? [...busy, ...quiet] : [...busy, ...quiet.slice(0, Math.max(0, LOUNGES_SHOWN - busy.length))]
  const hidden = busy.length + quiet.length - shown.length

  return (
    <section className="flex flex-col gap-3">
      <GameSectionTitle count={busy.length || undefined}>Group game rooms</GameSectionTitle>
      <div className="gu-panel-flat flex flex-col divide-y divide-[var(--gu-line)] px-1">
        {shown.map((g) => (
          <LoungeRow key={g.id} group={g} lounge={lounges[g.id] ?? null} />
        ))}
      </div>
      {hidden > 0 || all ? (
        <GameButton tone="cream" size="sm" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${groups.length} groups`}
        </GameButton>
      ) : null}
    </section>
  )
}

/**
 * A group's always-open game room: who's in it now, and what they're
 * playing. Not a link (a long press mustn't pop the browser's link menu) —
 * the Enter button presses in like every game button.
 */
export function LoungeRow({ group, lounge }: { group: Pick<Group, "id" | "name" | "icon">; lounge: Lounge | null }) {
  const router = useRouter()
  const here = Object.entries(lounge?.here ?? {})
  const go = () => router.push(`/lounge/${group.id}`)
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          go()
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="flex cursor-pointer items-center gap-3 px-2 py-2.5 select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]"
    >
      <GroupIcon src={group.icon} alt={group.name} size="lg" className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold">{group.name}</span>
        {here.length > 0 ? (
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="flex shrink-0 -space-x-2">
              {here.slice(0, 3).map(([id, v]) => (
                <GameAvatar key={id} uid={id} character={v.avatar} photo={v.photo} name={v.name} size={22} className="rounded-full shadow-[0_0_0_2px_#fff]" />
              ))}
            </span>
            <span className="truncate text-xs font-bold text-[var(--gu-green-deep)]">
              {here.length} in{lounge?.game ? ` · ${LIVE_GAMES[lounge.game].shortName ?? LIVE_GAMES[lounge.game].name}` : ""}
            </span>
          </span>
        ) : (
          <span className="block text-xs font-bold text-[var(--gu-ink-soft)]">Always open · drop in</span>
        )}
      </span>
      <GameButton
        tone={here.length > 0 ? "green" : "blue"}
        size="sm"
        className="shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          go()
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {here.length > 0 ? "Join" : "Enter"}
      </GameButton>
    </div>
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
