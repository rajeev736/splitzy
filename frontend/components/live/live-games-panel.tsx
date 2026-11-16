"use client"

import * as React from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { isLiveConfigured } from "@/lib/firebase/config"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAME_IDS, LIVE_GAMES, type LiveGameInfo } from "@/lib/live/games"
import type { LiveGameId } from "@/lib/live/types"
import { CreateRoomSheet } from "./create-room-sheet"
import { JoinRoomCard } from "./join-room-card"
import { ActiveRooms, RecentRooms, RoomInvites, useLiveRooms } from "./your-rooms"

/**
 * The Live tab on Games, in the order you reach for things: a room code box,
 * the game you're in (if any), friends' invites, then the games to start — and
 * finished games last, so a long history never pushes the games out of reach.
 * The room itself lives at /play/{code} (components/live/room-shell).
 */
export function LiveGamesPanel() {
  const { user } = useSession()
  const rooms = useLiveRooms(user?.uid)
  const [sheet, setSheet] = React.useState<{ open: boolean; game: LiveGameId }>(
    { open: false, game: "scribble" }
  )

  const [search, setSearch] = React.useState("")

  // Games you played lately come first; the rest keep their usual order
  const played = [...rooms.active, ...rooms.finished].map((r) => r.meta.game)
  const recent = LIVE_GAME_IDS.filter((id) => played.includes(id)).sort((a, b) => played.indexOf(a) - played.indexOf(b))
  const ordered = [...recent, ...LIVE_GAME_IDS.filter((id) => !recent.includes(id))]
  const q = search.trim().toLowerCase()
  const shown = q ? ordered.filter((id) => LIVE_GAMES[id].name.toLowerCase().includes(q)) : ordered

  if (!isLiveConfigured) return <NotConfigured />

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Play together, live — same room, same time. Voice and stickers included.
      </p>

      {rooms.watchers}
      <JoinRoomCard />
      {user && <ActiveRooms rooms={rooms.active} uid={user.uid} />}
      <RoomInvites invites={rooms.invites} now={rooms.now} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Pick a game</h2>
        {/* Once there are many games, a search box; the tiles stay small so they fit at a glance */}
        {LIVE_GAME_IDS.length > SEARCH_FROM && (
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games"
              aria-label="Search games"
              className="h-10 pl-9"
            />
          </div>
        )}
        <div className="grid grid-cols-4 gap-x-1 gap-y-3 rounded-xl border border-card-stroke bg-card p-3 shadow-xs sm:grid-cols-6">
          {shown.map((id) => (
            <GameTile
              key={id}
              game={LIVE_GAMES[id]}
              recent={recent.includes(id)}
              onPlay={() => setSheet({ open: true, game: id })}
            />
          ))}
          {shown.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-muted-foreground">No game called “{search}”</p>
          )}
        </div>
      </section>

      {user && <RecentRooms rooms={rooms.finished} uid={user.uid} />}

      {/* Keyed by game: each game's sheet starts from its own default options */}
      <CreateRoomSheet
        key={sheet.game}
        game={sheet.game}
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />
    </div>
  )
}

/** More games than this and a search box appears. */
const SEARCH_FROM = 12

/** One game to start, like an app icon: tap to set up a room (the sheet tells you about the game). */
function GameTile({
  game,
  recent,
  onPlay,
}: {
  game: LiveGameInfo
  recent: boolean
  onPlay: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${game.name}`}
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none transition-transform focus-visible:outline-2 focus-visible:outline-foreground active:scale-95"
    >
      <span className="relative">
        <LiveGameLogo game={game.id} className="size-14 rounded-2xl shadow-sm" />
        {recent && (
          <span
            aria-label="Played lately"
            className="absolute -top-1 -right-1 size-3 rounded-full bg-primary ring-2 ring-card"
          />
        )}
      </span>
      <span className="line-clamp-2 w-full text-[11px] leading-tight font-medium">{game.shortName ?? game.name}</span>
    </button>
  )
}

/** The Realtime Database URL is missing from this deployment: nothing live can run. */
function NotConfigured() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
        <span
          className="flex size-12 items-center justify-center rounded-xl bg-muted text-2xl"
          aria-hidden
        >
          🎮
        </span>
        <p className="text-base font-semibold">
          Live games aren&apos;t switched on here
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This server has no Realtime Database URL set (
          <code className="text-xs">NEXT_PUBLIC_FIREBASE_DATABASE_URL</code>),
          which rooms, drawing and voice need. Whoever runs it can add one from
          Firebase Console → Realtime Database — it&apos;s free. The Discounted
          and Just for fun games work as usual.
        </p>
      </CardContent>
    </Card>
  )
}
