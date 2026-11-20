"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import { NewRoomFlow } from "@/components/live/new-room/new-room-flow"
import { isLiveGameId } from "@/components/live/new-room/pieces"
import { GameButton, GamePanel, GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { useRouter } from "nextjs-toploader/app"

/** /play/new/ludo — set up a room for one game (components/live/new-room). */
export default function NewRoomPage() {
  const params = useParams<{ game: string }>()
  const router = useRouter()
  const game = params.game
  if (!isLiveGameId(game)) {
    return (
      <GameScreen>
        <GameTopBar onBack={() => router.replace("/challenges")} />
        <div className="mx-auto w-full max-w-sm px-5 pt-16">
          <GamePanel title="Oops">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="font-semibold text-[var(--gu-ink-soft)]">We don&apos;t have that game.</p>
              <GameButton onClick={() => router.replace("/challenges")}>Pick a game</GameButton>
            </div>
          </GamePanel>
        </div>
      </GameScreen>
    )
  }
  // Keyed: another game starts from its own defaults
  return (
    <React.Suspense fallback={<GameScreen />}>
      <NewRoomFlow key={game} game={game} />
    </React.Suspense>
  )
}
