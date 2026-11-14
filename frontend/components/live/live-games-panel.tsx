"use client"

import * as React from "react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Card, CardContent } from "@/components/ui/card"
import { isLiveConfigured } from "@/lib/firebase/config"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAME_IDS, LIVE_GAMES, type LiveGameInfo } from "@/lib/live/games"
import type { LiveGameId } from "@/lib/live/types"
import { CreateRoomSheet, playersLabel } from "./create-room-sheet"
import { JoinRoomCard } from "./join-room-card"
import { YourRooms } from "./your-rooms"

/**
 * The Live tab on Games: pick a game to open a room, join a friend's room by
 * code, and get back into rooms you've been in. The room itself lives at
 * /play/{code} (components/live/room-shell).
 */
export function LiveGamesPanel() {
  const { user } = useSession()
  const [sheet, setSheet] = React.useState<{ open: boolean; game: LiveGameId }>(
    { open: false, game: "scribble" }
  )

  if (!isLiveConfigured) return <NotConfigured />

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Play together, live — same room, same time. Voice and stickers included.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Pick a game</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LIVE_GAME_IDS.map((id) => (
            <GameCard
              key={id}
              game={LIVE_GAMES[id]}
              onPlay={() => setSheet({ open: true, game: id })}
            />
          ))}
        </div>
      </section>

      <JoinRoomCard />
      {user && <YourRooms uid={user.uid} />}

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

/** One game to start: tap anywhere to set up a room. */
function GameCard({
  game,
  onPlay,
}: {
  game: LiveGameInfo
  onPlay: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${game.name}`}
      className="flex flex-col gap-2 rounded-xl border border-card-stroke bg-card p-3 text-left shadow-xs transition-colors outline-none hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:bg-muted/60"
    >
      <span className="flex w-full items-start justify-between gap-2">
        <LiveGameLogo game={game.id} className="size-12 rounded-xl" />
        <span className="flex h-7 shrink-0 items-center gap-0.5 rounded-full bg-primary/10 pr-1.5 pl-2.5 text-xs font-semibold text-primary">
          Play
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{game.name}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground">
          {game.tagline}
        </span>
      </span>
      <span className="mt-auto block text-[11px] text-muted-foreground">
        {playersLabel(game)} · {game.duration}
      </span>
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
