import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAMES } from "@/lib/live/games"
import type { LiveGameId } from "@/lib/live/types"

/** A plain splash: the game's logo and name over the app's blue, with a loading bar. */
export function GenericSplash({ game, progress }: { game: LiveGameId; progress: number }) {
  return (
    <div className="flex size-full flex-col items-center justify-between bg-gradient-to-b from-[#3b6ff0] to-[#1a3a9c] px-8 py-[18vh] text-white">
      <div className="flex flex-col items-center gap-4">
        <LiveGameLogo game={game} className="size-24 rounded-3xl shadow-xl" />
        <p className="text-center text-3xl font-black tracking-tight drop-shadow">{LIVE_GAMES[game].name}</p>
      </div>
      <div className="h-3 w-48 overflow-hidden rounded-full bg-black/30 ring-2 ring-white/40">
        <div className="h-full rounded-full bg-[#4ade80] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
